FROM hexpm/elixir:1.11.3-erlang-23.2.3-ubuntu-bionic-20200921 AS dev

ENV APP_DEPS="openssl git ca-certificates inotify-tools curl iputils-ping"

COPY \
  ./entrypoint.sh \
  /usr/local/bin

ADD \
  https://raw.githubusercontent.com/humpangle/wait-until/v0.1.1/wait-until \
  /usr/local/bin/

RUN \
  groupadd ebnis && \
  useradd -m -g ebnis ebnis && \
  mkdir -p /home/ebnis/app/apps && \
  chmod 755 /usr/local/bin/entrypoint.sh && \
  chmod 755 /usr/local/bin/wait-until && \
  chown ebnis:ebnis /usr/local/bin/entrypoint.sh && \
  chown ebnis:ebnis /usr/local/bin/wait-until && \
  chown -R ebnis:ebnis /home/ebnis/app && \
  apt-get update && \
  apt-get install -y ${APP_DEPS} --no-install-recommends && \
  rm -rf /var/lib/apt/lists/* && \
  rm -rf /usr/share/doc && \
  rm -rf /usr/share/man && \
  apt-get clean

# run app as non root user to avoid volume mount problems
USER ebnis

WORKDIR /home/ebnis/app

COPY . .

# hex has to be installed as the user that will compile and run our app
RUN \
  mix local.hex --force && \
  mix local.rebar --force && \
  mix do deps.get, deps.compile

CMD ["/bin/bash"]

############################### build image ###############################

FROM dev AS build

ARG IS_E2E

ENV \
  MIX_ENV=prod \
  IS_E2E=${IS_E2E}

RUN \
  mix do deps.get --only prod, compile && \
  mix release && \
  rm -rf deps

############################### release image ###############################

FROM debian:buster AS prod

ARG DOCKER_HOST_USER_NAME

# we install 'libtinfo5' because of `beam.smtp` error
ENV \
  APP_DEPS="openssl libtinfo5 curl" \
  HOME_VAR=/home/ebnis \
  LANG=C.UTF-8

COPY --from=build /usr/local/bin/entrypoint.sh /usr/local/bin

COPY --from=build /usr/local/bin/wait-until /usr/local/bin

RUN \
  groupadd ebnis && \
  useradd -m -g ebnis ebnis && \
  mkdir -p /home/ebnis/app/apps && \
  chmod 755 /usr/local/bin/entrypoint.sh && \
  chmod 755 /usr/local/bin/wait-until && \
  chown ebnis:ebnis /usr/local/bin/entrypoint.sh && \
  chown ebnis:ebnis /usr/local/bin/wait-until && \
  chown -R ebnis:ebnis /home/ebnis/app && \
  apt-get update && \
  apt-get install -y ${APP_DEPS} --no-install-recommends && \
  rm -rf /var/lib/apt/lists/* && \
  rm -rf /usr/share/doc && rm -rf /usr/share/man && \
  apt-get clean

USER ebnis

WORKDIR /home/ebnis/app

COPY --from=build --chown=ebnis:ebnis \
  /home/ebnis/app/_build/prod/rel/ebnis \
  ./

CMD ["/bin/bash"]
