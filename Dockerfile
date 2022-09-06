FROM node:17-alpine

RUN apk add --no-cache git tzdata && addgroup -S rocket && adduser -S rocket -G rocket

ENV TZ=Europe/Berlin

USER rocket
WORKDIR /app
COPY --chown=rocket:rocket package.json node_modules lib index.js /app/

ENV TZ=Europe/Berlin
ENV DATA_FILE /data/data.json
VOLUME /data

CMD ["index.js"]