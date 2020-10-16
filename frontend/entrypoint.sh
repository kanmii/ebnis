#!/usr/bin/env bash

set -e

# wait-until "curl --output /dev/null --silent --head --fail http://api:${PORT}${BACKEND_HEALTH_CHECK_URL}"

if ping -q -c 1 -W 1 google.com >/dev/null; then
  yarn install
fi

yarn start dev
