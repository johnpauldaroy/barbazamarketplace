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
    curl \
    icu-libs \
    libzip \
    oniguruma \
    sqlite-libs \
    && apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    curl-dev \
    oniguruma-dev \
    sqlite-dev \
    && docker-php-ext-install \
    bcmath \
    curl \
    mbstring \
    pcntl \
    pdo \
    pdo_mysql \
    pdo_sqlite \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY docker/entrypoint.sh /usr/local/bin/entrypoint

RUN chmod +x /usr/local/bin/entrypoint \
    && mkdir -p storage bootstrap/cache database \
    && chown -R www-data:www-data storage bootstrap/cache database

EXPOSE 8000

ENTRYPOINT ["entrypoint"]
