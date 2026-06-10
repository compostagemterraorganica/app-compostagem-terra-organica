FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src
COPY routes ./routes
COPY utils ./utils

RUN mkdir -p uploads

EXPOSE 3000

CMD ["npm", "run", "dev"]
