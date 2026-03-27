#!/bin/sh
set -e

cd /var/www/html

if [ -z "${APP_KEY:-}" ]; then
  echo "APP_KEY is required. Set it in Dokploy environment variables."
  exit 1
fi

mkdir -p \
  bootstrap/cache \
  database \
  storage/app/public \
  storage/framework/cache \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs

touch database/database.sqlite

if [ ! -L public/storage ]; then
  php artisan storage:link || true
fi

php artisan migrate --force

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
