FROM nginx:latest

ARG SERVER_NAME
ENV SERVER_NAME=$SERVER_NAME

COPY nginx.conf /etc/nginx/conf.d/default.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
