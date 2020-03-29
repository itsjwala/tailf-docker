FROM node:alpine

WORKDIR /tmp

COPY package.json package.json

RUN npm install --save-prod

COPY . .

EXPOSE 8081

ENTRYPOINT ["node","/tmp/server.js"]
