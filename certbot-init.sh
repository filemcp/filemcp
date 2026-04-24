#!/bin/bash

set -e

ENVIRONMENT=${1:-"staging"}
EMAIL=${2:-""}

if [ -z "$EMAIL" ]; then
  echo "Usage: $0 staging|production your@email.com"
  exit 1
fi

if [ "$ENVIRONMENT" = "staging" ]; then
  DOMAINS="-d staging.filemcp.com -d api.staging.filemcp.com"
  CERT_NAME="staging.filemcp.com"
else
  DOMAINS="-d filemcp.com -d www.filemcp.com -d api.filemcp.com"
  CERT_NAME="filemcp.com"
fi

CERTBOT_WWW=$(docker volume inspect docker_certbot_www --format '{{ .Mountpoint }}')
CERTBOT_CERTS=$(docker volume inspect docker_certbot_certs --format '{{ .Mountpoint }}')

echo "Creating dummy cert so nginx can start..."
mkdir -p "$CERTBOT_CERTS/live/$CERT_NAME"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "$CERTBOT_CERTS/live/$CERT_NAME/privkey.pem" \
  -out "$CERTBOT_CERTS/live/$CERT_NAME/fullchain.pem" \
  -subj "/CN=localhost" 2>/dev/null

echo "Starting nginx..."
cd /srv/docker && docker compose up -d nginx

echo "Removing dummy cert..."
rm -rf "$CERTBOT_CERTS/live/$CERT_NAME"

echo "Requesting cert from Let's Encrypt..."
docker run --rm \
  -v "$CERTBOT_WWW:/var/www/certbot" \
  -v "$CERTBOT_CERTS:/etc/letsencrypt" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  $DOMAINS

echo "Reloading nginx..."
cd /srv/docker && docker compose exec nginx nginx -s reload

echo "Done. SSL active for $ENVIRONMENT."
