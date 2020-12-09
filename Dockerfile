FROM node:alpine

WORKDIR /app
ADD . /app

RUN apk add --no-cache git &&\
    npm install --production

ENV DATA_FILE /data/data.json
VOLUME /data

CMD ["index.js"]