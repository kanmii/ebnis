#!/usr/bin/env bash

set -e

if [ "$MIX_ENV" == "prod" ]; then
  if [ "$CREATE_DATABASE" == "true" ]; then
    bin/ebnis eval "Ebnis.Release.create"
    wait-until "bin/ebnis eval "Ebnis.Release.migrate""
  else
    wait-until "bin/ebnis eval "Ebnis.Release.migrate""
  fi

  bin/ebnis start
else
  node_name="${DEV_NODE_NAME:-$MIX_ENV}"
  cookie="${DEV_COOKIE:-"ebnis-cookie"}"

  if ping -q -c 1 -W 1 8.8.8.8 >/dev/null; then
    /usr/local/bin/wait-until "mix do deps.get, compile && mix ecto.create"
  else
    /usr/local/bin/wait-until "mix ecto.create"
  fi

  /usr/local/bin/wait-until "mix ecto.migrate"

  # we need the node name so we can attach a remote iex console thus:
  # iex --sname pick_a_name \
  #   --cookie ebnis-cookie \
  #   --remsh $node_name@container_id

  echo -e "\n-----------------NODE NAME/cookie----------------"
  echo -e "Node name:\t\t$node_name"
  echo -e "   Cookie:\t\t$cookie"
  echo -e "-------------------------------------------------\n"

  # An easy way to attach to a running iex session in this container
  echo 'alias conn-iex="iex --sname console --cookie ${DEV_COOKIE} --remsh ${DEV_NODE_NAME}@${HOSTNAME}"' >> "$HOME/.bashrc"

  elixir --sname $node_name --cookie $cookie -S mix phx.server
fi
