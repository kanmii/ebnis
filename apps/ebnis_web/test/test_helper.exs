Absinthe.Test.prime(EbnisWeb.Schema)

{:ok, _} = Application.ensure_all_started(:hound)

ExUnit.start(exclude: [integration: true, db: true])

Ecto.Adapters.SQL.Sandbox.mode(EbData.DefaultImpl.Repo, :manual)
