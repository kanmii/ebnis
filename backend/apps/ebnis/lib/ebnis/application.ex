defmodule Ebnis.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  def start(_type, _args) do
    children = [
      # Start the PubSub system
      {Phoenix.PubSub, name: Ebnis.PubSub}
      # Start a worker by calling: Ebnis.Worker.start_link(arg)
      # {Ebnis.Worker, arg}
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: Ebnis.Supervisor)
  end
end
