FROM php:8.2-apache
RUN apt-get update && apt-get install -y --no-install-recommends \
      libsqlite3-dev pkg-config iputils-ping \
 && docker-php-ext-install pdo pdo_sqlite \
 && a2enmod rewrite \
 && rm -rf /var/lib/apt/lists/*
COPY app/ /var/www/html/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
 && chown -R www-data:www-data /var/www/html \
 && chmod 777 /tmp
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
