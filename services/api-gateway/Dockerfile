FROM node:20-alpine

WORKDIR /app
COPY services/api-gateway/package*.json ./
RUN npm install --omit=dev
COPY services/api-gateway/server.js ./

EXPOSE 5200
CMD ["npm", "start"]

