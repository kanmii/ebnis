######################  BUILD ##############################################
FROM elixir:1.9.4-slim AS build

ARG APP_PATH=/ebnis_app
ARG APPS_PATHS=${APP_PATH}/apps

RUN apt-get update \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man

RUN mkdir -p ${APPS_PATHS}
WORKDIR ${APP_PATH}

ARG MIX_ENV=prod
ENV MIX_ENV=${MIX_ENV}

RUN mix local.hex --force \
  && mix local.rebar --force

COPY mix.exs mix.lock ./
COPY config config

# copy mix.exs files from apps/
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

COPY rel rel
COPY . .
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
ENV EBNIS_PORT=4000

RUN apt-get update \
  && apt-get install -y ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean

RUN useradd ebnis

RUN mkdir -p ${APP_PATH}
WORKDIR ${APP_PATH}

COPY ./docker/entrypoint.sh .

RUN chown ebnis:ebnis ${APP_PATH}
RUN chown ebnis:ebnis entrypoint.sh
RUN chmod +x entrypoint.sh

USER ebnis:ebnis

COPY --from=build --chown=ebnis:ebnis ${APP_PATH}/_build/${MIX_ENV}/rel/${APP} ./

ENV HOME=${APP_PATH}

EXPOSE ${EBNIS_PORT}

ENTRYPOINT ["/ebnis_app/entrypoint.sh"]

CMD ["bin/ebnis", "start"]
