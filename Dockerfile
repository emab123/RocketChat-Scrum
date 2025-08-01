FROM node:17-alpine

RUN apk add --no-cache git tzdata && addgroup -S rocket && adduser -S rocket -G rocket

ENV TZ=America/Sao_Paulo

USER rocket
WORKDIR /app
COPY --chown=rocket:rocket . /app/

ENV TZ=America/Sao_Paulo
ENV DATA_FILE /data/data.json
VOLUME /data
RUN npm install
CMD ["index.js"]
