FROM node:20-alpine

WORKDIR /app
COPY services/traveler-service/package*.json ./
RUN npm install --omit=dev
COPY services/traveler-service/server.js ./

EXPOSE 5201
CMD ["npm", "start"]

