FROM mysql:8.0

ENV MYSQL_ROOT_PASSWORD=rootpassword
ENV MYSQL_DATABASE=bodega_db
ENV MYSQL_USER=admin
ENV MYSQL_PASSWORD=secretpassword

COPY init.sql /docker-entrypoint-initdb.d/

EXPOSE 3306