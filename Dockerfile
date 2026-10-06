# syntax=docker/dockerfile:1

# ---- build: php deps + frontend assets ----
# One stage, not two: the Wayfinder Vite plugin runs
# `php artisan wayfinder:generate` during `npm run build`, which needs a
# fully bootable Laravel app (vendor/, a real .env, APP_KEY) already in
# place. Building JS assets in an isolated node-only stage can't satisfy
# that.
FROM composer:2 AS build

# Filament needs ext-intl at "composer install" time (platform check), not
# just at runtime — neither the composer:2 nor the node:22-alpine images
# ship it by default.
RUN apk add --no-cache curl nodejs npm \
    && curl -sSL https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions -o /usr/local/bin/install-php-extensions \
    && chmod +x /usr/local/bin/install-php-extensions \
    && install-php-extensions intl \
    && rm /usr/local/bin/install-php-extensions

WORKDIR /app

COPY composer.json composer.lock ./
COPY app app
COPY bootstrap bootstrap
COPY config config
COPY database database
COPY routes routes
COPY artisan artisan
COPY .env.example .env

# bootstrap/cache/*.php is in .dockerignore (stale local cache shouldn't be
# baked into the image), so the directory arrives empty — but it still has
# to exist for package:discover to write its compiled cache into it.
RUN mkdir -p bootstrap/cache storage/framework/cache storage/framework/views storage/logs

# A throwaway build-time-only APP_KEY — never shipped (only vendor/ and
# public/build get copied into the runtime image, not this .env), just
# enough for the app to boot while generating Wayfinder's TS files and
# while composer's post-autoload-dump scripts run artisan commands.
RUN sed -i "s|^APP_KEY=.*|APP_KEY=base64:$(php -r 'echo base64_encode(random_bytes(32));')|" .env

RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY resources resources
COPY vite.config.ts tsconfig.json ./

RUN npm run build \
    && rm .env

# ---- runtime ----
FROM php:8.4-fpm-alpine AS runtime

RUN apk add --no-cache nginx supervisor curl \
    && curl -sSL https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions -o /usr/local/bin/install-php-extensions \
    && chmod +x /usr/local/bin/install-php-extensions \
    && install-php-extensions pdo_pgsql pdo_sqlite gd zip intl bcmath exif pcntl opcache \
    && rm /usr/local/bin/install-php-extensions

WORKDIR /var/www/html

COPY . .
COPY --from=build /app/vendor vendor
COPY --from=build /app/public/build public/build

RUN mkdir -p \
        storage/app/public \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/testing \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
