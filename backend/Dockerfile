FROM composer:2 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./
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
    && docker-php-ext-install \
    bcmath \
    mbstring \
    pcntl \
    pdo \
    pdo_mysql \
    pdo_sqlite

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY docker/entrypoint.sh /usr/local/bin/entrypoint

RUN chmod +x /usr/local/bin/entrypoint \
    && mkdir -p storage bootstrap/cache database \
    && chown -R www-data:www-data storage bootstrap/cache database

EXPOSE 8000

ENTRYPOINT ["entrypoint"]
