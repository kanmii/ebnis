FROM hexpm/elixir:1.11.3-erlang-23.2.3-ubuntu-bionic-20200921 AS dev

ENV APP_DEPS="openssl git ca-certificates inotify-tools curl iputils-ping"

RUN apt-get update \
  && apt-get install -y ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean \
  && groupadd ebnis \
  && useradd -m -g ebnis ebnis

COPY ./entrypoint.sh /usr/local/bin

ADD https://raw.githubusercontent.com/humpangle/wait-until/v0.1.1/wait-until /usr/local/bin/

WORKDIR /home/ebnis/app

COPY . .

RUN chown -R \
  ebnis:ebnis \
  /home/ebnis \
  && chmod 755 /usr/local/bin/entrypoint.sh \
  && chmod 755 /usr/local/bin/wait-until

# run app as non root user to avoid volume mount problems
USER ebnis

# hex has to be installed as the user that will compile and run our app
RUN mix local.hex --force \
  && mix local.rebar --force \
  && mix do deps.get, deps.compile

CMD ["/bin/bash"]

############################### build image ###############################

FROM dev AS build

ARG IS_E2E

ENV MIX_ENV=prod \
  IS_E2E=${IS_E2E}

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

COPY ./entrypoint.sh /usr/local/bin

ADD https://raw.githubusercontent.com/humpangle/wait-until/v0.1.1/wait-until /usr/local/bin/

WORKDIR /home/ebnis/app

COPY --from=build --chown=ebnis:ebnis /home/ebnis/app/_build/prod/rel/ebnis ./

RUN chown -R \
  ebnis:ebnis \
  /home/ebnis \
  && chmod 755 /usr/local/bin/entrypoint.sh \
  && chmod 755 /usr/local/bin/wait-until

USER ebnis

CMD ["/bin/bash"]
