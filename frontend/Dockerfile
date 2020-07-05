FROM node:12.17.0-buster-slim

ARG NODE_ENV

ENV BUILD_DEPS="build-essential" \
  NODE_ENV=$NODE_ENV

RUN apt-get update \
  && apt-get install -y ${BUILD_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get purge -y --auto-remove ${BUILD_DEPS} \
  && apt-get clean \
  && mkdir /home/node/ebnis-web

WORKDIR /home/node/ebnis-web

COPY package.json yarn.lock package-scripts.js ./
COPY . .

RUN chown -R node:node /home/node

USER node

RUN yarn install

CMD ["/bin/bash"]
