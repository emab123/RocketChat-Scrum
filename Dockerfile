FROM node:alpine

WORKDIR /app
ADD . /app

ENV TZ=Europe/Berlin
RUN apk add --no-cache git tzdata &&\
    npm install

ENV TZ=Europe/Berlin
ENV DATA_FILE /data/data.json
VOLUME /data

CMD ["index.js"]