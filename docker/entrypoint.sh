#!/bin/bash

set -e

TIMEOUT=60

wait_for() {
  echo -e "\n\n\n\n\n=========Running $@================\n\n\n"
  eval "$@"

  for i in `seq $TIMEOUT` ; do
    result=$?

    if [ $result -eq 0 ] ; then
      echo -e "\n\n\n\n\n========= Done running $@================\n\n\n"
      return 0
    else
        eval "$@"
    fi
    sleep 1
  done

  echo -e "\nOperation timed out" >&2
  exit 1
}

if [ "$MIX_ENV" == "prod" ]; then
  wait_for bin/ebnis eval "Ebnis.Release.create"
  eval "Ebnis.Release.migrate"
  bin/ebnis start
else
  wait_for mix ecto.create
  mix ecto.migrate

  node_name="${DEV_NODE_NAME:-$MIX_ENV}"
  cookie="${DEV_COOKIE:-"ebnis-cookie"}"

  # we need the node name so we can attach ao remote iex console thus:
  # iex --sname pick_a_name \
  #   --cookie ebnis-cookie \
  #   --remsh $node_name@containerId

  echo -e "\n-----------------NODE NAME/cookie----------------"
  echo -e "Node name:\t\t$node_name"
  echo -e "   Cookie:\t\t$cookie"
  echo -e "-------------------------------------------------\n"

  elixir --sname $node_name --cookie $cookie -S mix phx.server
fi
