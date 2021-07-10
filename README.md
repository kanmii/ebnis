# Ebnis

# How to develop

```
cp .env.example .env
```

Edit `.env` to set up the environment variables to appropriate values

## Start the containers with docker-compose

We will need to source the `env` file in the shell as an alternative to
providing a `.env` file required by docker and docker-compose to read
environment variables when building images. Sourcing in shell provides
the flexibility to build and run different images in different shells since
there can be only one `.env` file in the root of our project.

## Start docker

```sh
# If you have named your `env` file anything other than `.env`
set -a; . .env-another; set +a;

docker-compose build js ex

docker-compose up cra ex
```

# Attach to running iex session in another shell

Inside the container:

1. The erlang cookie is set to `ebnis-cookie` but can be changed by setting
   the `DEV_COOKIE` environment variable.

2. Node name is `MIX_ENV` by default. Customize by setting `DEV_NODE_NAME`
   environment variable.

See the file `ex/entrypoint.sh` for usage of these variables.

3. Attach to the running container

```
set -a; . .env-e2e; set +a; docker-compose exec ex /bin/bash
```

4. Inside the container:

```sh
iex --sname you_must_choose_a_name \
  --cookie enter_cookie \
  --remsh node_name@container_id
```

You can get the `container_id` from your `bash` prompt inside the container
or `HOSTNAME` environment variable inside the container
or run `docker ps` in another shell to obtain your `container_id`.

# Test Elixir app

In a new shell, `docker-compose exec` into a running `ex` docker-compose
service container running in development mode:

```
set -a; . .env-another; set +a;

docker-compose exec ex /bin/bash
```

Once inside the container,

```
MIX_ENV=test iex -S mix
```

Run test in watch mode:

```
mix test.watch
```

# Test Javascript App

`cd` into `js` folder

Get dependencies

`yarn install`

run `yarn start` to discover available commands

### Watch files and run tests

```
yarn start cra.t
```

### test coverage

```
yarn start cra.t.c
```

# Production

## Test `production` deployment locally

```
cp .env.example .env-prod
```

Edit `.env-prod` to set production environment variables

Do not forget to set `DATABASE_SSL` to a value that is not `true` to disable
`ssl`.

And set `MIX_ENV` to `prod`

Source the environment variables in your shell and build the docker image

```
set -a; . .env-prod; set +a; docker build --build-arg DOCKER_HOST_USER_NAME -t ebnis-be-release ./ex
```

A docker image named `ebnis-be-release` will be built.
