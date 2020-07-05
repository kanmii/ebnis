import ApolloClient from "apollo-client";
import { experienceDefinitionResolvers } from "./new-experience.resolvers";

// istanbul ignore next:
export function addResolvers(client: ApolloClient<{}>) {
  if (window.____ebnis.experienceDefinitionResolversAdded) {
    return;
  }

  client.addResolvers(experienceDefinitionResolvers);
  window.____ebnis.experienceDefinitionResolversAdded = true;
}
