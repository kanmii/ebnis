/* istanbul ignore file */
import { ApolloClient, InMemoryCache } from "@apollo/client";

export const QUERY_NAME_getExperience = "getExperience";

export interface CacheContext {
  cache: InMemoryCache;
  client: ApolloClient<{}>;
  getCacheKey: (args: { __typename: string; id: string }) => string;
}

export type LocalResolverFn<TVariables = {}, TReturnedValue = void> = (
  root: object,
  variables: TVariables,
  context: CacheContext,
) => TReturnedValue;

export function makeApolloCacheRef(typeName: string, id: string | number) {
  return `${typeName}:${id}`;
}
