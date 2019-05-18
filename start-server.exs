# This script helps to manage certain tasks, such as loading environments,
# running migrations etc, before we start phoenix server
# user like so from the command line: elixir start-server.exs --env=staging

Code.prepend_path(Path.expand("_build/dev/lib/jason/ebin", "."))

{:ok, envs} = Jason.decode(File.read!(".env-cmdrc"))
{args, _} = OptionParser.parse!(System.argv(), strict: [env: :string])

# the environment key we want to load, passed in on the command line
env = Keyword.fetch!(args, :env)

# load the environments
System.put_env(Enum.to_list(envs[env]))

# if we are in staging environment, we automatically execute certain mix tasks
if env == "staging" do
  IO.puts(["\n>> Running migration for env staging"])
  {response, 0} = System.cmd("mix", ["ecto.migrate"])
  IO.puts([">> ", String.trim(response), "\n"])
end

# load environment for email during development and tests
System.put_env(Enum.to_list(envs["email"]))
IO.puts([">> starting server\n"])

case :os.type() do
  {:win32, _} ->
    case env do
      "dev" ->
        :os.cmd('start cmd /c "iex --dot-iex .iexa.exs --werl -S mix phx.server"')

      "staging" ->
        :os.cmd('start cmd /c "iex -S mix phx.server"')
    end

  _ ->
    case env do
      "dev" ->
        :os.cmd('iex --dot-iex .iexa.exs -S mix phx.server')

      "staging" ->
        :os.cmd('iex -S mix phx.server')
    end
end
