#!/usr/bin/env bash

ELIXIR_DIR="/home/elixir/ebnis"

cd ELIXIR_DIR

mix local.hex --force
mix local.rebar
mix deps.get

exit $?
