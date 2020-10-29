defmodule EbnisData.Repo do
  use Ecto.Repo,
    otp_app: :ebnis_data,
    adapter: Ecto.Adapters.Postgres

  if Application.compile_env(:ebnis, :is_e2e) do
    def reset_db do
      query(~s(
          TRUNCATE users
          CASCADE;
        ))
    end
  end
end
