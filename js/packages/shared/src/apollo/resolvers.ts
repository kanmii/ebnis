/* istanbul ignore file */
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { Any } from "@eb/shared/src/utils/types";

export const QUERY_NAME_getExperience = "getExperience";

export interface CacheContext {
  cache: InMemoryCache;
  client: ApolloClient<Any>;
  getCacheKey: (args: { __typename: string; id: string }) => string;
}

export type LocalResolverFn<TVariables = Any, TReturnedValue = void> = (
  root: Any,
  variables: TVariables,
  context: CacheContext,
) => TReturnedValue;

export function makeApolloCacheRef(typeName: string, id: string | number) {
  return `${typeName}:${id}`;
}
