FROM node:alpine

WORKDIR /tmp

COPY package.json package.json

RUN npm install --save-prod

COPY . .

ENTRYPOINT ["node","/tmp/client.js"]
