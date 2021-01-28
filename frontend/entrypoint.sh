#!/usr/bin/env bash

set -e

app="cra"

function yarnInstall {
  if ping -q -c 1 -W 1 google.com >/dev/null; then
    echo -e "\nFetching and building node packages for app: $app."
    echo -e "Running: 'yarn install --frozen-lockfile'\n"

    yarn install --frozen-lockfile

    echo -e "\nDone running: 'yarn install --frozen-lockfile' for app: $app\n"
  fi
}

# Create react app inotify issue
echo fs.inotify.max_user_watches=524288 | tee -a /etc/sysctl.conf && sysctl -p

yarnInstall;

yarn start cra
