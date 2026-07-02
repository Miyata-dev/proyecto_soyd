FROM postgres:15-alpine

ENV POSTGRES_DB=fichas_db
ENV POSTGRES_USER=admin
ENV POSTGRES_PASSWORD=secretpassword

COPY init.sql /docker-entrypoint-initdb.d/

EXPOSE 5432