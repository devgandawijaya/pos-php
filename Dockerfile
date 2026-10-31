FROM sales-app:latest

WORKDIR /var/www/html

# Configuration overrides
COPY docker/php/local.ini /usr/local/etc/php/conf.d/local.ini
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy application code
COPY . /var/www/html

# Set proper permissions for storage
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["php-fpm"]
