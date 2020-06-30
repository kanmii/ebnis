FROM elixir:1.9.4-slim AS build

ENV MIX_ENV=prod

RUN apt-get update \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean \
  && mix local.hex --force \
  && mix local.rebar --force \
  && mkdir -p /src

WORKDIR /src

COPY . .

RUN mix do deps.get --only prod, compile \
  && mix release \
  && rm -rf docker \
  && rm -rf deps

CMD ["/bin/bash"]

############################ prepare release image ###########################

FROM debian:buster AS release

ENV APP_DEPS="openssl" \
    LANG=C.UTF-8

RUN apt-get update \
  && apt-get install -y ${APP_DEPS} --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/share/doc && rm -rf /usr/share/man \
  && apt-get clean \
  && groupadd me \
  && useradd -g me me \
  && mkdir -p /me-app/assets/build \
  && chown -R me:me /me-app

COPY ./docker/entrypoint.sh /usr/local/bin

RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /me-app

COPY --from=build --chown=me:me /src/_build/prod/rel/me ./

USER me

ENV HOME=/me-app

CMD ["/bin/bash"]
