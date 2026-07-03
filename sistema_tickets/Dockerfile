FROM node:20-alpine

WORKDIR /app

# Copia solo los archivos de configuración
COPY package.json ./

# Instala las dependencias
RUN npm install

# Copia todo el resto del código fuente
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]