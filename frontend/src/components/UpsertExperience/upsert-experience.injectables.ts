import { ApolloClient } from "@apollo/client";
import { upsertExperienceResolvers } from "./upsert-experience.resolvers";

// istanbul ignore next:
export function addResolvers(client: ApolloClient<{}>) {
  if (window.____ebnis.experienceDefinitionResolversAdded) {
    return;
  }

  client.addResolvers(upsertExperienceResolvers);
  window.____ebnis.experienceDefinitionResolversAdded = true;
}
