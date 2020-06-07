#!/bin/bash
set -e

echo -e "\n\n------------------Migrating database-------------------\n"

bin/ebnis eval "Ebnis.Release.migrate"

echo -e "\n\n"

exec "$@"
