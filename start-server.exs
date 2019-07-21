# This script helps to manage certain tasks, such as loading environments,
# running migrations etc, before we start web server during development and test
# use like so from the command line:
#   elixir start-server.exs --env=staging [...other_options]
#   elixir start-server.exs --prefix='gnome-terminal --'
#   elixir start-server.exs --env=staging --prefix='tmux -c' --dry
# Options include:
#   env {string} - the MIX_ENV of our mix application. Defaults to `dev`
#   dry {string} - just echo the command, but do not run - useful if you would
#     like to run the command yourself because you have a complicated use case
#     but you need the environment variables and iex commands
#   prefix {string} - e.g. your terminal emulator as shown example above. For
# windows, this will default to `'start cmd /c`

# load {jason} JSON parser
# this is assuming you have already compiled this project in dev environment

Path.expand("_build/dev/lib/jason/ebin", ".")
|> Code.prepend_path()

# the environment variables are read from the .env-cmdrc file located at the
# root of this project
{:ok, envs} =
  Path.expand(".env-cmdrc", ".")
  |> File.read!()
  |> Jason.decode()

{args, _} =
  OptionParser.parse!(
    System.argv(),
    strict: [
      env: :string,
      prefix: :string,
      dry: :boolean
    ]
  )

# the environment key we want to load, passed in on the command line
# defaults to dev environment
env = Keyword.get(args, :env, "dev")

# load the environments
all_envs = Enum.to_list(envs[env] || []) ++ Enum.to_list(envs["email"])
System.put_env(all_envs)

# execute mix tasks for staging environment
if env == "staging" do
  IO.puts(["\n>> Running migration for env staging"])
  {response, 0} = System.cmd("mix", ["ecto.migrate"])
  IO.puts([">> ", String.trim(response), "\n"])
end

# start server in shell
{command, prefix} =
  case :os.type() do
    {:win32, _} ->
      prefix =
        Keyword.get(args, :prefix, "start cmd /c")
        |> String.to_charlist()

      command =
        case env do
          "dev" ->
            'iex --dot-iex .iexa.exs --werl -S mix phx.server'

          _ ->
            'iex -S mix phx.server'
        end

      {command, prefix}

    _ ->
      prefix =
        Keyword.get(args, :prefix, "")
        |> String.to_charlist()

      command =
        case env do
          "dev" ->
            'iex --dot-iex .iexa.exs -S mix phx.server'

          _ ->
            'iex -S mix phx.server'
        end

      {command, prefix}
  end

case Keyword.get(args, :dry) do
  nil ->
    composite_command = prefix ++ ' "' ++ command ++ '"'

    IO.puts([">> starting server with command:\n\t", composite_command, "\n"])
    :os.cmd(composite_command)

  _ ->
    IO.puts([
      "\n\n\n",
      prefix,
      "\n",
      Enum.map(all_envs, fn {k, v} -> [k, "=", v, " "] end),
      "  ",
      command,
      "\n\n\n\n"
    ])
end
