FROM node:18-alpine

WORKDIR /app

# Copia los archivos de configuración
COPY package.json ./

# Instala las dependencias
RUN npm install

# Copia todo el resto del código fuente
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]