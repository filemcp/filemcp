#!/bin/bash

set -e

ENVIRONMENT="development"
UP_FLAGS="-d"
BASE_COMPOSE_FILE="docker-compose.yml"

function show_help() {
  echo "cdnmcp Docker Helper"
  echo ""
  echo "Usage: ./bb [command] [options]"
  echo ""
  echo "Commands:"
  echo "  start     Start all services"
  echo "  stop      Stop all services"
  echo "  logs      View service logs (follows by default)"
  echo "  enter     Shell into a running container"
  echo "  restart   Restart a service"
  echo "  status    Show running containers"
  echo ""
  echo "Options:"
  echo "  --foreground          Run in foreground (start command)"
  echo "  --service=<name>      Target a specific service"
  echo ""
  echo "Services: api, web, postgres, redis, minio"
  echo ""
  echo "Examples:"
  echo "  ./bb start"
  echo "  ./bb start --foreground"
  echo "  ./bb logs"
  echo "  ./bb logs --service=api"
  echo "  ./bb enter --service=api"
  echo "  ./bb restart --service=api"
  echo "  ./bb stop"
}

function parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --foreground)
        UP_FLAGS=""
        shift
        ;;
      --service=*)
        SERVICE_NAME="${1#*=}"
        shift
        ;;
      *)
        shift
        ;;
    esac
  done
}

function check_docker() {
  if ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not available."
    exit 1
  fi
}

function check_files() {
  if [ ! -f "$BASE_COMPOSE_FILE" ]; then
    echo "Error: $BASE_COMPOSE_FILE not found. Run this from the project root."
    exit 1
  fi
}

function compose() {
  docker compose -f $BASE_COMPOSE_FILE "$@"
}

function start() {
  parse_args "$@"
  check_docker
  check_files

  echo "========== Starting cdnmcp =========="

  echo "Stopping any running containers..."
  compose down 2>/dev/null || true

  echo "Starting services..."
  if [ -n "$SERVICE_NAME" ]; then
    compose up -d "$SERVICE_NAME"
    echo "$SERVICE_NAME started."
  else
    compose up $UP_FLAGS
    if [ -n "$UP_FLAGS" ]; then
      echo ""
      echo "All services started in detached mode."
      echo ""
      echo "  Web:        http://localhost:3000"
      echo "  API:        http://localhost:4000"
      echo "  API docs:   http://localhost:4000/api/docs"
      echo "  MinIO:      http://localhost:9001"
      echo ""
      echo "  ./bb logs              - follow all logs"
      echo "  ./bb logs --service=api - follow api logs"
      echo "  ./bb stop              - stop everything"
    fi
  fi
}

function stop() {
  parse_args "$@"
  check_docker
  check_files

  echo "Stopping services..."
  compose down
  echo "Done."
}

function logs() {
  SERVICE_NAME=""
  parse_args "$@"
  check_docker
  check_files

  if [ -n "$SERVICE_NAME" ]; then
    compose logs -f "$SERVICE_NAME"
  else
    compose logs -f
  fi
}

function enter() {
  SERVICE_NAME=""
  parse_args "$@"
  check_docker
  check_files

  if [ -z "$SERVICE_NAME" ]; then
    echo "Error: specify a service with --service=<name>"
    echo ""
    echo "Running services:"
    compose ps --services
    exit 1
  fi

  echo "Entering $SERVICE_NAME..."
  compose exec "$SERVICE_NAME" bash 2>/dev/null || compose exec "$SERVICE_NAME" sh
}

function restart() {
  SERVICE_NAME=""
  parse_args "$@"
  check_docker
  check_files

  if [ -n "$SERVICE_NAME" ]; then
    echo "Restarting $SERVICE_NAME..."
    compose stop "$SERVICE_NAME"
    compose start "$SERVICE_NAME"
  else
    echo "Restarting all services..."
    compose down
    compose up $UP_FLAGS
  fi
  echo "Done."
}

function status() {
  check_docker
  check_files
  compose ps
}

case "$1" in
  start)
    shift
    start "$@"
    ;;
  stop)
    shift
    stop "$@"
    ;;
  logs)
    shift
    logs "$@"
    ;;
  enter)
    shift
    enter "$@"
    ;;
  restart)
    shift
    restart "$@"
    ;;
  status)
    status
    ;;
  *)
    show_help
    ;;
esac
