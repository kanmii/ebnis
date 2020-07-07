FROM node:12.17.0-buster-slim

ARG NODE_ENV

ENV BUILD_DEPS="build-essential" \
  APP_DEPS="curl" \
  NODE_ENV=$NODE_ENV

RUN apt-get update \
  && apt-get install -y ${BUILD_DEPS} \
  ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get purge -y --auto-remove ${BUILD_DEPS} \
  && apt-get clean \
  && mkdir /home/node/ebnis-web

COPY ./entrypoint.sh /usr/local/bin

ADD https://raw.githubusercontent.com/humpangle/wait-until/v0.1.1/wait-until /usr/local/bin/

WORKDIR /home/node/ebnis-web

COPY package.json yarn.lock package-scripts.js ./
COPY . .

RUN chown -R node:node /home/node \
  && chmod 755 /usr/local/bin/entrypoint.sh \
  && chmod 755 /usr/local/bin/wait-until

USER node

RUN yarn install

CMD ["/bin/bash"]
