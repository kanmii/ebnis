FROM hexpm/elixir:1.9.4-erlang-22.3.4.2-debian-buster-20200511 AS build

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

############################### release image ###############################

FROM debian:buster AS release

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

COPY ./docker/entrypoint.sh /usr/local/bin

RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /ebnis-app

COPY --from=build --chown=ebnis:ebnis /src/_build/prod/rel/ebnis ./

USER ebnis

ENV HOME=/ebnis-app

CMD ["/bin/bash"]
