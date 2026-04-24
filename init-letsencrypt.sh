#!/bin/bash

# Run this once on the server after first deploy to get SSL certs.
# Usage: bash init-letsencrypt.sh staging|production your@email.com

set -e

ENVIRONMENT=${1:-"staging"}
EMAIL=${2:-""}

if [ -z "$EMAIL" ]; then
  echo "Usage: $0 staging|production your@email.com"
  exit 1
fi

if [ "$ENVIRONMENT" = "staging" ]; then
  DOMAINS=("staging.filemcp.com" "api.staging.filemcp.com")
  CERT_NAME="staging.filemcp.com"
else
  DOMAINS=("filemcp.com" "www.filemcp.com" "api.filemcp.com")
  CERT_NAME="filemcp.com"
fi

COMPOSE_DIR="/srv/docker"

echo "Creating dummy cert so nginx can start..."
mkdir -p "/etc/letsencrypt/live/$CERT_NAME"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "/etc/letsencrypt/live/$CERT_NAME/privkey.pem" \
  -out "/etc/letsencrypt/live/$CERT_NAME/fullchain.pem" \
  -subj "/CN=localhost" 2>/dev/null

echo "Starting nginx..."
cd "$COMPOSE_DIR"
docker compose up -d nginx

echo "Removing dummy cert..."
rm -rf "/etc/letsencrypt/live/$CERT_NAME"

echo "Requesting real cert from Let's Encrypt..."
DOMAIN_ARGS=""
for domain in "${DOMAINS[@]}"; do
  DOMAIN_ARGS="$DOMAIN_ARGS -d $domain"
done

docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  $DOMAIN_ARGS

echo "Reloading nginx with real cert..."
docker compose exec nginx nginx -s reload

echo "Done. Certs issued for: ${DOMAINS[*]}"
