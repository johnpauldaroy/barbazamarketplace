# syntax=docker/dockerfile:1
# Root Dockerfile — builds the Laravel backend
# Used when Dokploy is configured in single-Dockerfile mode pointing at repo root

FROM composer:2 AS vendor

WORKDIR /app

COPY backend/composer.json backend/composer.lock ./
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --optimize-autoloader \
    --no-scripts

FROM php:8.2-cli-alpine

WORKDIR /var/www/html

RUN apk add --no-cache \
    bash \
    icu-libs \
    libzip \
    oniguruma \
    sqlite-libs \
    && apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    sqlite-dev \
    && docker-php-ext-install \
    bcmath \
    mbstring \
    pdo \
    pdo_mysql \
    pdo_sqlite \
    zip \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY backend/ .
COPY --from=vendor /app/vendor ./vendor
COPY backend/docker/entrypoint.sh /usr/local/bin/entrypoint

RUN chmod +x /usr/local/bin/entrypoint \
    && mkdir -p storage/app/public storage/framework/cache storage/framework/sessions \
       storage/framework/views storage/logs bootstrap/cache database \
    && chown -R www-data:www-data storage bootstrap/cache database

EXPOSE 8000

ENTRYPOINT ["entrypoint"]
