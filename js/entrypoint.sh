#!/usr/bin/env bash

set -e

if ping -q -c 1 -W 1 google.com >/dev/null; then
  echo -e "\nFetching and building node packages"
  echo -e "Running: 'yarn install --frozen-lockfile --prefer-offline'\n"

  yarn install --frozen-lockfile --prefer-offline

  echo -e "\nDone running: 'yarn install --frozen-lockfile --prefer-offline'\n"
fi
