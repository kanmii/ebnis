#!/usr/bin/env bash

set -e

app="$EBNIS_APP_NAME"

function yarnInstall {
  if ping -q -c 1 -W 1 google.com >/dev/null; then
    echo -e "\nFetching and building node packages for app: $app."
    echo -e "Running: 'yarn install --frozen-lockfile'\n"

    yarn install --frozen-lockfile

    echo -e "\nDone running: 'yarn install --frozen-lockfile' for app: $app\n"
  fi
}

if [ -n "$FRONTEND_APP" ]; then
  echo -e "\n\n :::::::: Starting Frontend App: $app :::::\n\n"

  yarnInstall;
  yarn start "$FRONTEND_APP"
else
  echo -e "\n\n :::::::: Starting All Apps :::::\n\n"

  yarnInstall;
  yarn start d
fi
