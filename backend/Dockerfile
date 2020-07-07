FROM hexpm/elixir:1.9.4-erlang-22.3.4.2-debian-buster-20200511 AS dev

ARG DOCKER_HOST_USER_NAME

ENV APP_DEPS="openssl git ca-certificates inotify-tools" \
   HOME_VAR=/home/${DOCKER_HOST_USER_NAME}

RUN apt-get update \
  && apt-get install -y ${APP_DEPS} ${BUILD_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean \
  && groupadd ${DOCKER_HOST_USER_NAME} \
  && useradd -m -g ${DOCKER_HOST_USER_NAME} ${DOCKER_HOST_USER_NAME}

COPY ./entrypoint.sh /usr/local/bin

WORKDIR ${HOME_VAR}/src

COPY . .

RUN chown -R \
  ${DOCKER_HOST_USER_NAME}:${DOCKER_HOST_USER_NAME} \
  ${HOME_VAR} \
  && chmod +x /usr/local/bin/entrypoint.sh

# run app as non root user to avoid volume mount problems
USER ${DOCKER_HOST_USER_NAME}

# hex has to be installed as the user that will compile and run our app
RUN mix local.hex --force \
  && mix local.rebar --force \
  && mix do deps.get, deps.compile

CMD ["/bin/bash"]

############################### build image ###############################

FROM dev AS build

ENV MIX_ENV=prod

RUN mix do deps.get --only prod, compile \
  && mix release \
  && rm -rf deps

############################### release image ###############################

FROM debian:buster AS release

ARG DOCKER_HOST_USER_NAME

ENV APP_DEPS="openssl" \
    LANG=C.UTF-8

RUN apt-get update \
  && apt-get install -y ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean \
  && groupadd ebnis \
  && useradd -g ebnis ebnis \
  && mkdir -p /ebnis-app \
  && chown -R ebnis:ebnis /ebnis-app

COPY ./entrypoint.sh /usr/local/bin

RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /ebnis-app

COPY --from=build --chown=ebnis:ebnis /home/${DOCKER_HOST_USER_NAME}/src/_build/prod/rel/ebnis ./

USER ebnis

ENV HOME=/ebnis-app

CMD ["/bin/bash"]
