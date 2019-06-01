# This script helps to manage certain tasks, such as loading environments,
# running migrations etc, before we start web server during development and test
# use like so from the command line:
#   elixir start-server.exs --env=staging [...other_options]
#   elixir start-server.exs --env=dev --terminal=xterm
# Other options include:
#   terminal {string} - your terminal emulator. Defaults to gnome-terminal. But
#                       only relevant if you are not on windows OS

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
      terminal: :string
    ]
  )

# the environment key we want to load, passed in on the command line
# defaults to dev environment
env = Keyword.get(args, :env, "dev")

# load the environments
System.put_env(Enum.to_list(envs[env]))

# execute mix tasks for staging environment
if env == "staging" do
  IO.puts(["\n>> Running migration for env staging"])
  {response, 0} = System.cmd("mix", ["ecto.migrate"])
  IO.puts([">> ", String.trim(response), "\n"])
end

# load environment for email during development and tests
System.put_env(Enum.to_list(envs["email"]))

IO.puts([">> starting server\n"])

# start server in shell
case :os.type() do
  {:win32, _} ->
    case env do
      "dev" ->
        :os.cmd('start cmd /c "iex --dot-iex .iexa.exs --werl -S mix phx.server"')

      "staging" ->
        :os.cmd('start cmd /c "iex -S mix phx.server"')
    end

  _ ->
    terminal =
      Keyword.get(args, :terminal, "gnome-terminal")
      |> String.to_charlist()

    case env do
      "dev" ->
        :os.cmd(terminal ++ ' -- iex --dot-iex .iexa.exs -S mix phx.server')

      "staging" ->
        :os.cmd(terminal ++ ' -- iex -S mix phx.server')
    end
end
