defmodule EbnisData.ExperienceApi do
  import Ecto.Query, warn: true

  alias EbnisData.Repo
  alias EbnisData.Experience1

  def list_experiences1 do
    query_with_field_definitions()
    |> Repo.all()
  end

  defp query_with_field_definitions do
    Experience1
    |> join(:inner, [e], fd in assoc(e, :field_definitions))
    |> preload([_, fd], field_definitions: fd)
  end
end
