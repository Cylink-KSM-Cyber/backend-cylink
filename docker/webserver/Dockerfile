FROM nginx:latest

ARG SERVER_NAME
ENV SERVER_NAME=$SERVER_NAME

COPY nginx.conf /etc/nginx/conf.d/default.conf.template

RUN envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
