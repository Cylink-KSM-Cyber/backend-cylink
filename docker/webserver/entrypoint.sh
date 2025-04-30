#!/bin/sh

# Render the final config
VAR_LIST='${SERVER_NAME}'
envsubst "$VAR_LIST" < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Debug
echo "---- Generated Nginx config ----"
cat /etc/nginx/conf.d/default.conf
echo "--------------------------------"

# Run nginx
exec nginx -g "daemon off;"
