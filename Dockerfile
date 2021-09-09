FROM node:lts-stretch-slim
USER node
WORKDIR /app
COPY package.json .
COPY src/ ./src
CMD [ "npm", "start" ]