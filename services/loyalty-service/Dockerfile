FROM node:20-alpine

WORKDIR /app
COPY services/loyalty-service/package*.json ./
RUN npm install --omit=dev
COPY services/loyalty-service/server.js ./

EXPOSE 5204
CMD ["npm", "start"]

