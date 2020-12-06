#!/usr/bin/env bash

set -e

# wait-until "curl --output /dev/null --silent --head --fail http://api:${PORT}${BACKEND_HEALTH_CHECK_URL}"

if ping -q -c 1 -W 1 google.com >/dev/null; then
  echo -e "\nFetching and building node packages."
  echo -e "Running:  'yarn install'\n"
  yarn install
fi

echo -e "\n\n :::::::: Starting App:::::\n\n"
yarn start cra
