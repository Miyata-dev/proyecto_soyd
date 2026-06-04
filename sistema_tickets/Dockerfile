FROM node:18-alpine

WORKDIR /app

# Copia solo los archivos de configuración primero (¡Esto es lo que no encontraba!)
COPY package.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de tu código (index.js, etc.)
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]