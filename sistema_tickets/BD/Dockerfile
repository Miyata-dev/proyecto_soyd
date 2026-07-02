FROM mariadb:10.11

# Variables de entorno por defecto (se sobreescriben en K8s)
ENV MARIADB_ROOT_PASSWORD=rootpassword
ENV MARIADB_DATABASE=tickets_db
ENV MARIADB_USER=admin
ENV MARIADB_PASSWORD=secretpassword

# Copiar el script de inicialización
COPY init.sql /docker-entrypoint-initdb.d/

EXPOSE 3306