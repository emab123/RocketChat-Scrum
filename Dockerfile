FROM node:17-alpine

RUN apk add --no-cache git tzdata && addgroup -S rocket && adduser -S rocket -G rocket

ENV TZ=Europe/Berlin

USER rocket
WORKDIR /app
COPY --chown=rocket:rocket package.json /app/

RUN npm install --cache .npm --prefer-offline &&\
    rm -rf .npm

COPY --chown=rocket:rocket lib/ /app/lib
COPY --chown=rocket:rocket index.js /app/

ENV TZ=Europe/Berlin
ENV DATA_FILE /data/data.json
VOLUME /data

CMD ["index.js"]