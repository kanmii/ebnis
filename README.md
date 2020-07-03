### Ebnis backend

# How to develop


__change .env-dev to .env-test/prod as the case may be__


```
cp .env.example .env-dev
```


Edit `.env-dev` to set up the environment variables to appropriate values


## Start the containers with docker-compose

```
cp .env-dev .env && docker-compose up
```


## Attach to running iex session in another shell


Inside the container:


1. The erlang cookie is set to `ebnis-cookie` but can be changed by setting
the `DEV_COOKIE` environment variable.

2. Node name is `MIX_ENV` by default. Customize by setting `DEV_NODE_NAME`
environment variable.


See the file `docker/entrypoint.sh`

----

3. Attach to the running container

```
docker exec -it container_name bash
```

4. Inside the container:

```
iex --sname you_must_choose_a_name \
  --cookie enter_cookie \
  --remsh node@container_id
```


You can get the `container_id` from your `bash` prompt inside the container.

Or run `docker ps` in another shell to obtain your `container_id`


# Testing


```
cp .env.example .env-test
```

Edit `.env-test` to set testing environment variables

Do not forget to set `MIX_ENV` to `test` and set `DATABASE_URL` appropriately


Source the environment variables in your shell

```
set -a; . .env-test; set +a
```


Start `test` task

```
mix test
```


Or watch files

```
mix test.watch
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


Source the environment variables in your shell

```
set -a; . .env-prod; set +a
```


Build the docker image:

```
docker build --build-arg DOCKER_HOST_USER_NAME -t ebnis-be-release .
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


Start phoenix app, linking the database host to the running postgres container

```
docker run -it --rm \
  --name ebnis-prod-api \
  --link=postgres-container-name:db \
  --env-file=.env-prod \
  -p $DOCKER_HOST_PORT:$PORT \
  ebnis-be-release /usr/local/bin/entrypoint.sh
```
