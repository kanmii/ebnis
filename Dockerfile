FROM elixir:1.9.4-slim AS build

ARG APP_PATH=/ebnis_app
ARG APPS_PATHS=${APP_PATH}/apps

# ENV APP_PATH=${APP_PATH}
ENV BUILD_DEPS="build-essential"
ENV APP_DEPS="git python"

RUN apt-get update \
  && apt-get install -y ${BUILD_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean

# prepare build dir
RUN mkdir -p ${APPS_PATHS}
WORKDIR ${APP_PATH}

# install hex + rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# set build ENV
ENV MIX_ENV=prod

# install mix dependencies
COPY mix.exs mix.lock ./
COPY config config

WORKDIR ${APPS_PATHS}

RUN mkdir -p ${APPS_PATHS}/ebnis
COPY apps/ebnis/mix.exs                         ebnis

RUN mkdir -p ${APPS_PATHS}/ebnis_emails
COPY apps/ebnis_emails/mix.exs                  ebnis_emails

RUN mkdir -p ${APPS_PATHS}/ebnis_data
COPY apps/ebnis_data/mix.exs                    ebnis_data

RUN mkdir -p ${APPS_PATHS}/ebnis_web
COPY apps/ebnis_web/mix.exs                     ebnis_web

WORKDIR ${APP_PATH}
RUN mix do deps.get --only ${MIX_ENV}, deps.compile

WORKDIR ${APPS_PATHS}

COPY apps/ebnis_data/priv                       ebnis_data/priv

COPY apps/ebnis/lib                             ebnis/lib
COPY apps/ebnis_emails/lib                      ebnis_emails/lib
COPY apps/ebnis_data/lib                        ebnis_data/lib
COPY apps/ebnis_web/lib                         ebnis_web/lib

# uncomment COPY if rel/ exists
# COPY rel rel
WORKDIR ${APP_PATH}
RUN mix do compile, release
CMD ["/bin/bash"]

############################ prepare release image ###########################

FROM debian:buster

ARG APP_PATH=/ebnis_app
ARG APP=ebnis
ARG MIX_ENV=prod

ENV APP=${APP}
ENV MIX_ENV=${MIX_ENV}
ENV APP_DEPS="openssl"
ENV LANG=C.UTF-8

RUN apt-get update \
  && apt-get install -y ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean

RUN useradd ebnis

RUN mkdir -p ${APP_PATH}
WORKDIR ${APP_PATH}

RUN chown ebnis:ebnis ${APP_PATH}

USER ebnis:ebnis

COPY --from=build --chown=ebnis:ebnis ${APP_PATH}/_build/${MIX_ENV}/rel/${APP} ./

ENV HOME=${APP_PATH}

CMD ["bin/ebnis", "start"]
