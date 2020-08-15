FROM node:12.17.0-buster-slim AS web

ARG NODE_ENV

ENV BUILD_DEPS="build-essential" \
  APP_DEPS="curl" \
  NODE_ENV=$NODE_ENV \
  HOST_APP_HOME="."

RUN apt-get update \
  && apt-get install -y ${BUILD_DEPS} \
  ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get purge -y --auto-remove ${BUILD_DEPS} \
  && apt-get clean \
  && mkdir /home/node/ebnis-web

COPY ${HOST_APP_HOME}/entrypoint.sh /usr/local/bin

ADD https://raw.githubusercontent.com/humpangle/wait-until/v0.1.1/wait-until /usr/local/bin/

WORKDIR /home/node/ebnis-web

COPY ${HOST_APP_HOME}/package.json ${HOST_APP_HOME}/yarn.lock ${HOST_APP_HOME}/package-scripts.js ./
COPY ${HOST_APP_HOME} .

RUN chown -R node:node /home/node \
  && chmod 755 /usr/local/bin/entrypoint.sh \
  && chmod 755 /usr/local/bin/wait-until

USER node

RUN yarn install

CMD ["/bin/bash"]
