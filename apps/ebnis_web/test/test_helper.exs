Absinthe.Test.prime(EbnisWeb.Schema)
ExUnit.start(exclude: [db: true])
Faker.start()
Ecto.Adapters.SQL.Sandbox.mode(EbData.DefaultImpl.Repo, :manual)
