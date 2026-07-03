# 1. Cambiamos a una imagen ligera de Python porque la bodega está en Python
FROM python:3.10-slim

WORKDIR /app

# 2. Instalamos las dependencias directamente aquí, sin necesidad de un archivo requirements.txt
RUN pip install --no-cache-dir flask==3.0.0 mysql-connector-python==8.2.0

# 3. Copia todo el resto del código fuente (incluyendo tu app.py)
COPY . .

# 4. La bodega corre en el puerto 5000 (según lo configurado en tu app.py y docker-compose)
EXPOSE 5000

# 5. Comando para iniciar tu aplicación de Python
CMD ["python", "app.py"]