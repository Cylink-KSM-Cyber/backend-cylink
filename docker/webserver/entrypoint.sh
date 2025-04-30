#!/bin/sh

# Render the final config
envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Run nginx
exec nginx -g "daemon off;"
