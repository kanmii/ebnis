#!/bin/bash

set -e

if [ "$MIX_ENV" == "prod" ]; then

  until bin/ebnis eval "Ebnis.Release.migrate" ; do
    >&2 echo "Postgres is unavailable - sleeping"
    sleep 1
  done

  bin/ebnis start
else

  until  mix ecto.migrate ; do
    >&2 echo "Postgres is unavailable - sleeping"
    sleep 1
  done

  # mix run apps/ebnis_data/priv/repo/seeds.exs

  node_name="${EBNIS_DEV_NODE_NAME:-$MIX_ENV}"
  cookie="${EBNIS_DEV_COOKIE:-"ebnis-cookie"}"

  # we need the node name so we can attach ao remote iex console thus:
  # iex --sname pick_a_name \
  #   --cookie ebnis-dev-cookie \
  #   --remsh $node_name@containerId

  echo -e "\n\n-------------NODE NAME/cookie----------------"
  echo -e "Node name:\t\t$node_name"
  echo -e "Cookie\t\t$cookie"
  echo -e "\n\n"

  elixir --sname $node_name --cookie $cookie -S mix phx.server
fi
