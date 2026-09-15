FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js index.html app.js style.css ./

EXPOSE 4173
CMD ["node", "server.js"]
