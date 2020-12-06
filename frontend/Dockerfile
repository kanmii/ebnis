FROM node:12.17.0-buster-slim AS web

ARG NODE_ENV

ENV BUILD_DEPS="build-essential" \
  APP_DEPS="curl iputils-ping" \
  NODE_ENV=$NODE_ENV \
  HOST_APP_HOME="." \
  PACKAGES_PATH=${HOST_APP_HOME}/packages

COPY ${HOST_APP_HOME}/entrypoint.sh /usr/local/bin

ADD https://raw.githubusercontent.com/humpangle/wait-until/v0.1.1/wait-until /usr/local/bin/

RUN apt-get update \
  && apt-get install -y ${BUILD_DEPS} \
  ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get purge -y --auto-remove ${BUILD_DEPS} \
  && apt-get clean \
  # Create react app inotify issue
  && echo fs.inotify.max_user_watches=524288 | tee -a /etc/sysctl.conf \
  && chmod 755 /usr/local/bin/entrypoint.sh \
  && chmod 755 /usr/local/bin/wait-until

USER node

RUN mkdir -p /home/node/ebnis-web/packages

WORKDIR /home/node/ebnis-web

COPY --chown=node:node ${HOST_APP_HOME}/package.json ${HOST_APP_HOME}/yarn.lock ${HOST_APP_HOME}/package-scripts.js ${HOST_APP_HOME}/tsconfig.json ./

COPY --chown=node:node ${PACKAGES_PATH}/commons/package.json ./packages/commons/

COPY --chown=node:node ${PACKAGES_PATH}/cra/package.json ./packages/cra/

COPY --chown=node:node ${PACKAGES_PATH}/cy/package.json ./packages/cy/

COPY --chown=node:node ${PACKAGES_PATH}/jsx/package.json ./packages/jsx/

RUN yarn --pure-lockfile

COPY --chown=node:node ${HOST_APP_HOME} ./

CMD ["/bin/bash"]
