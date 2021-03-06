### Ebnis

# How to develop

**change .env-e2e to .env-test/prod as the case may be**

```
cp .env.example .env-e2e
```

Edit `.env-e2e` to set up the environment variables to appropriate values

## Start the containers with docker-compose

We will need to source the `env` file in the shell as an alternative to
providing a `.env` file required by docker and docker-compose to read
environment variables when building images. Sourcing in shell provides
the flexibility to build and run different images in different shells since
there can be only one `.env` file in the root of our project.

## Start docker

```
set -a; . .env-e2e; set +a;

docker-compose build js-base js-cra ex

docker-compose up js-cra ex
```

## Attach to running iex session in another shell

Inside the container:

1. The erlang cookie is set to `ebnis-cookie` but can be changed by setting
   the `DEV_COOKIE` environment variable.

2. Node name is `MIX_ENV` by default. Customize by setting `DEV_NODE_NAME`
   environment variable.

See the file `ex/entrypoint.sh`

3. Attach to the running container

```
set -a; . .env-e2e; set +a; docker-compose exec ex bash
```

4. Inside the container:

```
iex --sname you_must_choose_a_name \
  --cookie enter_cookie \
  --remsh node_name@container_id
```

You can get the `container_id` from your `bash` prompt inside the container
or `HOSTNAME` environment variable inside the container
or run `docker ps` in another shell to obtain your `container_id`

To make it easy, a `bash` alias was created: `conn-iex`
See the file `ex/entrypoint.sh`

# Testing elixir app

In a new shell, `docker-compose exec` into a running `ex` docker-compose
service container running in development mode:

```
set -a; . .env-e2e; set +a;

docker-compose exec ex bash
```

Once inside the container,

```
MIX_ENV=test iex -S mix
```

Since we are using [cortex](https://github.com/urbint/cortex) as test runner,
tests will be automatically ran on file changes. You may also manually run
tests. See the [cortex](https://github.com/urbint/cortex) project for how
to do this.

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

A docker image named `ebnis-be-release` will be built

### Connect to a local postgres server running on your docker host

in `path/to/data/postgresql.conf`, set `listen_addresses`:

```
listen_addresses = '*'
```

in `path/to/data/pg_hba.conf` put:

```
host    all             all             172.17.0.0/16           trust
```

assuming `172.17.0.1` is the `inet` when you run `ifconfig docker0`

Restart postgres server

```
pg_ctl restart
```

Inside `.env-prod`, set `$DOCKER_ADD_DB_HOST` and run

```
docker run -it --rm \
  --name ebnis-prod-api \
  --add-host=$DOCKER_ADD_DB_HOST \
  --env-file=.env-prod \
  -p $DOCKER_HOST_PORT:$PORT \
  ebnis-be-release /usr/local/bin/entrypoint.sh
```

You can access the phoenix server at `$DOCKER_HOST_PORT`

### Connect to a postgres server running in a docker container

Start a postgres container

```
docker run -d --name postgres-container-name -e POSTGRES_PASSWORD=password postgres:12.2
```

Or restart one

```
docker start postgres-container-name
```

Start phoenix app, linking the database host to the running postgres container

```
docker run -it --rm \
  --name ebnis-prod-api \
  --link=postgres-container-name:db \
  --env-file=.env-prod \
  -p $DOCKER_HOST_API_PORT:$PORT \
  ebnis-be-release /usr/local/bin/entrypoint.sh
```

## Javascript App

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
yarn start cra.tc
```
