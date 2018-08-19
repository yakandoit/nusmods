Rails.application.routes.draw do
  devise_for :users
  root to: redirect('/graphiql')

  mount LetterOpenerWeb::Engine, at: '/letter_opener' if Rails.env.development?

  mount RailsAdmin::Engine => '/admin', as: 'rails_admin'

  mount GraphiQL::Rails::Engine, at: "/graphiql", graphql_path: "/graphql"
  post "/graphql", to: "graphql#execute"
end