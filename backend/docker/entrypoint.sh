#!/bin/sh
set -e

# Generate app key if not set
if [ -z "$APP_KEY" ]; then
  php artisan key:generate --force
fi

# --- SQLite setup ---
if [ "$DB_CONNECTION" = "sqlite" ] || [ -z "$DB_CONNECTION" ]; then
  DB_FILE="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
  mkdir -p "$(dirname "$DB_FILE")"
  if [ ! -f "$DB_FILE" ]; then
    touch "$DB_FILE"
    echo "Created SQLite database: $DB_FILE"
  fi
fi

# --- MySQL: wait until DB is reachable ---
if [ "$DB_CONNECTION" = "mysql" ]; then
  MAX="${MIGRATION_MAX_ATTEMPTS:-30}"
  attempt=0
  echo "Waiting for MySQL at $DB_HOST:$DB_PORT..."
  until php -r "new PDO('mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_DATABASE', '$DB_USERNAME', '$DB_PASSWORD');" 2>/dev/null; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$MAX" ]; then
      echo "ERROR: MySQL not reachable after $MAX attempts. Exiting."
      exit 1
    fi
    echo "  attempt $attempt/$MAX — retrying in 2s..."
    sleep 2
  done
  echo "MySQL is ready."
fi

# --- Run migrations ---
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "Running migrations..."
  php artisan migrate --force

  # Seed only on a fresh DB (no users yet)
  USER_COUNT=$(php artisan tinker --execute="echo \App\Models\User::count();" 2>/dev/null | tail -1)
  if [ "$USER_COUNT" = "0" ]; then
    echo "Fresh database detected — seeding initial data..."
    php artisan db:seed --force
  fi
else
  echo "Skipping migrations (RUN_MIGRATIONS=0)"
fi

# --- Cache config and routes ---
php artisan config:cache
php artisan route:cache

# --- Storage link (public disk) ---
php artisan storage:link --force 2>/dev/null || true

# --- Fix permissions ---
chown -R www-data:www-data storage bootstrap/cache

echo "Starting supervisord (nginx + laravel)..."
exec supervisord -c /etc/supervisord.conf
