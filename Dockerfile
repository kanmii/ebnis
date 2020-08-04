FROM hexpm/elixir:1.10.4-erlang-23.0.2-debian-stretch-20200511 AS dev

ARG DOCKER_HOST_USER_NAME

ENV APP_DEPS="openssl git ca-certificates inotify-tools curl" \
   HOME_VAR=/home/${DOCKER_HOST_USER_NAME} \
   HOST_APP_HOME="backend"

RUN apt-get update \
  && apt-get install -y ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean \
  && groupadd ${DOCKER_HOST_USER_NAME} \
  && useradd -m -g ${DOCKER_HOST_USER_NAME} ${DOCKER_HOST_USER_NAME}

COPY ./${HOST_APP_HOME}/entrypoint.sh /usr/local/bin

ADD https://raw.githubusercontent.com/humpangle/wait-until/v0.1.1/wait-until /usr/local/bin/

WORKDIR ${HOME_VAR}/src

COPY ./${HOST_APP_HOME} .

RUN chown -R \
  ${DOCKER_HOST_USER_NAME}:${DOCKER_HOST_USER_NAME} \
  ${HOME_VAR} \
  && chmod 755 /usr/local/bin/entrypoint.sh \
  && chmod 755 /usr/local/bin/wait-until

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
    LANG=C.UTF-8 \
   HOST_APP_HOME="backend"

RUN apt-get update \
  && apt-get install -y ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean \
  && groupadd ebnis \
  && useradd -g ebnis ebnis \
  && mkdir -p /ebnis-app \
  && chown -R ebnis:ebnis /ebnis-app

COPY ./${HOST_APP_HOME}/entrypoint.sh /usr/local/bin

ADD https://raw.githubusercontent.com/humpangle/wait-until/v0.1.1/wait-until /usr/local/bin/

RUN chmod 755 /usr/local/bin/entrypoint.sh \
    && chmod 755 /usr/local/bin/wait-until

WORKDIR /ebnis-app

COPY --from=build --chown=ebnis:ebnis /home/${DOCKER_HOST_USER_NAME}/src/_build/prod/rel/ebnis ./

USER ebnis

ENV HOME=/ebnis-app

CMD ["/bin/bash"]
