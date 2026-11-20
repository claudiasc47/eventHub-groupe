# Serveur de développement Vite pour le service `web` de docker-compose.
# Le compose monte ./frontend dans /app et garde les node_modules de l'image.
FROM node:22.12.0-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
