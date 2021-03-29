FROM node:14.17.0-buster-slim AS web

ARG APT_FETCH

ADD \
  https://raw.githubusercontent.com/humpangle/wait-until/v0.1.1/wait-until \
  /usr/local/bin

COPY \
  ./entrypoint.sh \
  /usr/local/bin

RUN \
  mkdir -p /app/_shared &&  \
  mkdir -p /app/packages/shared &&  \
  mkdir -p /app/packages/cra &&  \
  mkdir -p /app/packages/jsx && \
  chown -R node:node /app && \
  chmod 755 /usr/local/bin/wait-until && \
  chmod 755 /usr/local/bin/entrypoint.sh && \
  if [ -n "$APT_FETCH" ]; then \
   apt-get update && \
   apt-get install -y --no-install-recommends iputils-ping && \
   rm -rf /var/lib/apt/lists/* && \
   rm -rf /usr/share/doc && \
   rm -rf /usr/share/man && \
   apt-get autoremove -y && \
   apt-get clean;  \
  fi

USER node
WORKDIR /app

######### ROOT FILES ##########
COPY  \
  --chown=node:node \
  ./package-scripts.js \
  ./package.json \
  ./yarn.lock \
  ./

COPY  \
  --chown=node:node \
  ./packages/shared/package.json \
  ./packages/shared/

COPY  \
  --chown=node:node \
  ./packages/cra/package.json \
  ./packages/cra/

COPY  \
  --chown=node:node \
  ./packages/jsx/package.json \
  ./packages/jsx/

RUN yarn install --frozen-lockfile

COPY --chown=node:node . .

CMD ["/bin/sh"]
