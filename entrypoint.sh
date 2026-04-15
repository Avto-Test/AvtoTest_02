#!/bin/bash
set -e

echo "Starting AutoTest application..."
echo "Running database migrations..."
 export ALLOW_PROD_MIGRATIONS=1
alembic upgrade head
echo "Migrations completed!"
echo "Starting Gunicorn server..."
exec gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
