# Serveur de développement Vite pour le service `web` de docker-compose.
# Le compose monte ./frontend dans /app et garde les node_modules de l'image.
FROM node:22.23.5-alpine

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
