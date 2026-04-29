#!/bin/bash

set -e

ENVIRONMENT=${ENVIRONMENT:-"staging"}
SSH_KEY_PATH=${SSH_KEY_PATH:-"$HOME/.ssh/id_rsa"}
SSH_USERNAME=${SSH_USERNAME:-""}
STAGING_HOST="63.183.87.117"
PRODUCTION_HOST="63.182.47.171"
AWS_REGION=${AWS_REGION:-"eu-central-1"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-$(aws configure get aws_access_key_id 2>/dev/null || echo "")}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-$(aws configure get aws_secret_access_key 2>/dev/null || echo "")}
AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN:-$(aws configure get aws_session_token 2>/dev/null || echo "")}
ECR_REPOSITORY_PREFIX="filemcp"
SERVICES=("api" "web" "worker" "nginx" "certbot")

SERVICE=""
ENV_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --env=*)              ENVIRONMENT="${1#*=}"; shift ;;
    --ssh-key=*)          SSH_KEY_PATH="${1#*=}"; shift ;;
    --account=*)          AWS_ACCOUNT_ID="${1#*=}"; shift ;;
    --region=*)           AWS_REGION="${1#*=}"; shift ;;
    --username=*)         SSH_USERNAME="${1#*=}"; shift ;;
    --aws-access-key=*)   AWS_ACCESS_KEY_ID="${1#*=}"; shift ;;
    --aws-secret-key=*)   AWS_SECRET_ACCESS_KEY="${1#*=}"; shift ;;
    --aws-session-token=*) AWS_SESSION_TOKEN="${1#*=}"; shift ;;
    --env-file=*)         ENV_FILE="${1#*=}"; shift ;;
    --service=*)
      SERVICE="${1#*=}"
      if [[ ! " ${SERVICES[@]} " =~ " ${SERVICE} " ]]; then
        echo "Error: Invalid service. Must be one of: ${SERVICES[*]}"
        exit 1
      fi
      shift
      ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
done

if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
  echo "Error: Invalid environment. Must be: staging or production"
  exit 1
fi

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: AWS_ACCOUNT_ID is not set. Use --account= or set the env var."
  exit 1
fi

if [ "$ENVIRONMENT" = "staging" ]; then
  TARGET_HOST=$STAGING_HOST
else
  TARGET_HOST=$PRODUCTION_HOST
fi

[ -n "$SERVICE" ] && SERVICES=("$SERVICE")

[ -f "$SSH_KEY_PATH" ] || { echo "Error: SSH key not found at $SSH_KEY_PATH"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DC="docker compose"

remote_exec() {
  local command="$1"
  ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$SSH_USERNAME@$TARGET_HOST" "bash -c '$command'"
}

echo "========== Releasing to $ENVIRONMENT ($TARGET_HOST) =========="

echo "Checking SSH connection..."
remote_exec "echo Connection successful" || { echo "Error: Cannot connect to $TARGET_HOST"; exit 1; }

echo "Preparing deploy directory..."
remote_exec "mkdir -p /srv/docker"

if [ -n "$ENV_FILE" ]; then
  [ -f "$ENV_FILE" ] || { echo "Error: env file not found at $ENV_FILE"; exit 1; }
  echo "Uploading .env to $TARGET_HOST..."
  remote_exec "cat > /srv/docker/.env" < "$ENV_FILE"
  remote_exec "chmod 600 /srv/docker/.env"
fi

# Substitute AWS vars in the compose file and copy to server
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT

local_compose="${SCRIPT_DIR}/docker-compose.${ENVIRONMENT}.yml"
processed_compose="${temp_dir}/docker-compose.yml"

AWS_ACCOUNT_ID="$AWS_ACCOUNT_ID" \
AWS_REGION="$AWS_REGION" \
envsubst '$AWS_ACCOUNT_ID $AWS_REGION' < "$local_compose" > "$processed_compose"

echo "Copying compose file to $TARGET_HOST..."
remote_exec "cat > /srv/docker/docker-compose.yml" < "$processed_compose"

echo "Copying nginx config to $TARGET_HOST..."
remote_exec "mkdir -p /srv/docker/nginx"
remote_exec "cat > /srv/docker/nginx/default.conf" < "${SCRIPT_DIR}/nginx/${ENVIRONMENT}.conf"
remote_exec "cd /srv/docker && $DC exec nginx nginx -s reload 2>/dev/null || true"

echo "Copying certbot-init script to $TARGET_HOST..."
remote_exec "cat > /srv/docker/certbot-init.sh" < "${SCRIPT_DIR}/certbot-init.sh"
remote_exec "chmod +x /srv/docker/certbot-init.sh"

# ECR login on the remote server
echo "Logging in to ECR on $TARGET_HOST..."
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_PASSWORD=$(aws ecr get-login-password --region "$AWS_REGION")
remote_exec "echo '$ECR_PASSWORD' | docker login --username AWS --password-stdin $ECR_REGISTRY"

# Pull new images
AWS_ENV="AWS_REGION=$AWS_REGION AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID"
AWS_ENV+=" AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"
AWS_ENV+=" AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY"
[ -n "$AWS_SESSION_TOKEN" ] && AWS_ENV+=" AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN"

if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    AWS_ENV+=" $key=$value"
  done < "$ENV_FILE"
fi

echo "Pulling images..."
for service in "${SERVICES[@]}"; do
  echo "Pulling $service..."
  remote_exec "cd /srv/docker && $AWS_ENV $DC pull $service"
done

echo "Starting services..."
services_str="${SERVICES[*]}"
remote_exec "cd /srv/docker && $AWS_ENV $DC up -d $services_str"

echo "Service status:"
remote_exec "cd /srv/docker && $DC ps"

echo "Recent logs:"
for service in "${SERVICES[@]}"; do
  echo "--- $service ---"
  remote_exec "cd /srv/docker && $DC logs --tail=20 $service"
done

# Clean up old ECR images on remote host
echo "Cleaning up stale images on $TARGET_HOST..."
remote_exec "docker image prune -f"

# Keep only last 3 images per repo in ECR
echo "Cleaning up old ECR images..."
for service in "${SERVICES[@]}"; do
  REPO="${ECR_REPOSITORY_PREFIX}-${service}"
  ALL_DIGESTS=$(aws ecr describe-images \
    --repository-name "$REPO" \
    --region "$AWS_REGION" \
    --query 'sort_by(imageDetails,& imagePushedAt)[*].imageDigest' \
    --output text \
    --no-paginate \
    --no-cli-pager 2>/dev/null || echo "")

  if [ -n "$ALL_DIGESTS" ]; then
    IFS=$'\t' read -r -a DIGESTS <<< "$ALL_DIGESTS"
    if [ ${#DIGESTS[@]} -gt 3 ]; then
      echo "Pruning ${service} ECR (keeping 3 of ${#DIGESTS[@]})..."
      for ((i=0; i<${#DIGESTS[@]}-3; i++)); do
        aws ecr batch-delete-image \
          --repository-name "$REPO" \
          --region "$AWS_REGION" \
          --image-ids "imageDigest=${DIGESTS[$i]}" \
          --no-cli-pager --no-paginate --output text 2>/dev/null || true
      done
    fi
  fi
done

echo "========== Release to $ENVIRONMENT completed ==========="
