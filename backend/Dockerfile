FROM hexpm/elixir:1.11.0-erlang-22.3.4.7-ubuntu-focal-20200703 AS dev

ARG DOCKER_HOST_USER_NAME

ENV APP_DEPS="openssl git ca-certificates inotify-tools curl" \
  HOME_VAR=/home/${DOCKER_HOST_USER_NAME} \
  HOST_APP_HOME="."

RUN apt-get update \
  && apt-get install -y ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean \
  && groupadd ${DOCKER_HOST_USER_NAME} \
  && useradd -m -g ${DOCKER_HOST_USER_NAME} ${DOCKER_HOST_USER_NAME}

COPY ${HOST_APP_HOME}/entrypoint.sh /usr/local/bin

ADD https://raw.githubusercontent.com/humpangle/wait-until/v0.1.1/wait-until /usr/local/bin/

WORKDIR ${HOME_VAR}/src

COPY ${HOST_APP_HOME} .

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

FROM debian:buster AS prod

ARG DOCKER_HOST_USER_NAME

# we install 'libtinfo5' because of `beam.smtp` error
ENV APP_DEPS="openssl libtinfo5 curl" \
  HOME_VAR=/home/ebnis \
  LANG=C.UTF-8 \
  HOST_APP_HOME="."

RUN apt-get update \
  && apt-get install -y ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean \
  && groupadd ebnis \
  && useradd -m -g ebnis ebnis

COPY ${HOST_APP_HOME}/entrypoint.sh /usr/local/bin

ADD https://raw.githubusercontent.com/humpangle/wait-until/v0.1.1/wait-until /usr/local/bin/

WORKDIR ${HOME_VAR}/app

COPY --from=build --chown=ebnis:ebnis /home/${DOCKER_HOST_USER_NAME}/src/_build/prod/rel/ebnis ./

RUN chown -R \
  ebnis:ebnis \
  ${HOME_VAR} \
  && chmod 755 /usr/local/bin/entrypoint.sh \
  && chmod 755 /usr/local/bin/wait-until

USER ebnis

CMD ["/bin/bash"]
