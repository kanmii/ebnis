#!/usr/bin/env bash

set -e

wait-until "curl --output /dev/null --silent --head --fail http://api:${PORT}${BACKEND_HEALTH_CHECK_URL}"

yarn start dev
