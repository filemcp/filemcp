#!/bin/bash

set -e

AWS_REGION=${AWS_REGION:-"eu-central-1"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}
ECR_REPOSITORY_PREFIX="filemcp"
ENVIRONMENT=${ENVIRONMENT:-"staging"}

SERVICES=(
  "api:apps/api/Dockerfile"
  "web:apps/web/Dockerfile"
  "worker:apps/worker/Dockerfile"
)

SERVICE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --env=*)      ENVIRONMENT="${1#*=}"; shift ;;
    --account=*)  AWS_ACCOUNT_ID="${1#*=}"; shift ;;
    --region=*)   AWS_REGION="${1#*=}"; shift ;;
    --service=*)  SERVICE="${1#*=}"; shift ;;
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

command -v aws    &>/dev/null || { echo "Error: AWS CLI not installed"; exit 1; }
command -v docker &>/dev/null || { echo "Error: Docker not installed"; exit 1; }

TIMESTAMP=$(date +%Y%m%d%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

build_and_push() {
  local service=$1
  local dockerfile=$2

  echo "========== Building $service for $ENVIRONMENT =========="

  local repo="${ECR_REPOSITORY_PREFIX}-${service}"
  local image="${ECR_REGISTRY}/${repo}"
  local env_tag="${ENVIRONMENT}-latest"
  local ts_tag="${ENVIRONMENT}-${TIMESTAMP}"

  local build_args=()
  if [ "$service" = "web" ]; then
    # Baked into prerendered pages (e.g. og:image meta) — must be set at build time.
    if [ -z "$NUXT_PUBLIC_APP_URL" ]; then
      echo "Error: NUXT_PUBLIC_APP_URL must be set when building the web service" >&2
      echo "  (it's baked into prerendered pages — set it to your public site URL, e.g. https://filemcp.com)" >&2
      exit 1
    fi
    build_args+=(--build-arg "NUXT_PUBLIC_APP_URL=${NUXT_PUBLIC_APP_URL}")
    build_args+=(--build-arg "NUXT_PUBLIC_GA_ID=${NUXT_PUBLIC_GA_ID}")
  fi

  echo "Building image..."
  docker build \
    -f "${SCRIPT_DIR}/${dockerfile}" \
    "${build_args[@]}" \
    -t "${image}:${env_tag}" \
    -t "${image}:${ts_tag}" \
    "${SCRIPT_DIR}"

  if [ "$ENVIRONMENT" = "production" ]; then
    docker tag "${image}:${env_tag}" "${image}:latest"
    docker tag "${image}:${env_tag}" "${image}:${TIMESTAMP}"
  fi

  echo "Creating ECR repository if needed..."
  aws ecr describe-repositories \
    --repository-names "${repo}" \
    --region "${AWS_REGION}" >/dev/null 2>&1 || \
  aws ecr create-repository \
    --repository-name "${repo}" \
    --region "${AWS_REGION}" >/dev/null

  echo "Logging in to ECR..."
  aws ecr get-login-password --region "${AWS_REGION}" | \
    docker login --username AWS --password-stdin "${ECR_REGISTRY}"

  echo "Pushing images..."
  docker push "${image}:${env_tag}"
  docker push "${image}:${ts_tag}"

  if [ "$ENVIRONMENT" = "production" ]; then
    docker push "${image}:latest"
    docker push "${image}:${TIMESTAMP}"
  fi

  echo "Pushed: ${image}:${env_tag}"
  echo "Pushed: ${image}:${ts_tag}"
  echo ""
}

echo "Starting build for $ENVIRONMENT..."

for service_config in "${SERVICES[@]}"; do
  IFS=':' read -r service dockerfile <<< "$service_config"
  if [ -z "$SERVICE" ] || [ "$SERVICE" = "$service" ]; then
    build_and_push "$service" "$dockerfile"
  fi
done

echo "Build completed for $ENVIRONMENT! Tagged: $ENVIRONMENT-latest, $ENVIRONMENT-$TIMESTAMP"
