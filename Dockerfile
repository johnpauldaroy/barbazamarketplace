# syntax=docker/dockerfile:1
# Single-container build: React (nginx:80) + Laravel (php:8000)
# Nginx proxies /api/* to localhost:8000

# ── Stage 1: PHP vendor deps ──────────────────────────────────────────────────
FROM composer:2 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --optimize-autoloader \
    --no-scripts

# ── Stage 2: React build ──────────────────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app
COPY barbazamarketplace/package*.json ./
RUN npm ci
COPY barbazamarketplace/ .
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
RUN npm run build

# ── Stage 3: Final image (nginx + php) ───────────────────────────────────────
FROM php:8.2-fpm-alpine

WORKDIR /var/www/html

# System deps
RUN apk add --no-cache \
    bash \
    nginx \
    supervisor \
    icu-libs \
    libzip \
    oniguruma \
    && apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    && docker-php-ext-install \
    bcmath \
    mbstring \
    pdo \
    pdo_mysql \
    pdo_sqlite \
    zip \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy Laravel backend
COPY backend/ .
COPY --from=vendor /app/vendor ./vendor

# Copy React build into nginx html dir
COPY --from=frontend /app/build /usr/share/nginx/html

# Nginx config
COPY barbazamarketplace/nginx/default.conf /etc/nginx/http.d/default.conf

# Supervisor config
COPY docker/supervisord.conf /etc/supervisord.conf

# Entrypoint
COPY backend/docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint \
    && mkdir -p storage/app/public storage/framework/cache \
       storage/framework/sessions storage/framework/views \
       storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80

ENTRYPOINT ["entrypoint"]
