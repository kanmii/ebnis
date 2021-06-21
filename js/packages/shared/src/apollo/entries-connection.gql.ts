/* istanbul ignore file */
import { FieldPolicy } from "@apollo/client/cache/inmemory/policies";
import {
  GetEntriesUnionFragment,
  GetEntriesUnionFragment_GetEntriesErrors,
  GetEntriesUnionFragment_GetEntriesSuccess,
  GetEntriesUnionFragment_GetEntriesSuccess_entries_edges,
} from "../graphql/apollo-types/GetEntriesUnionFragment";

export const getEntriesConnectionFieldPolicy: FieldPolicy<
  EntriesCacheUnion,
  GetEntriesUnionFragment
> = {
  keyArgs: ["experienceId"],

  merge(existing, incoming) {
    if (!incoming) {
      return existing as EntriesCacheUnion;
    }

    if (!existing) {
      return incoming as EntriesCacheUnion;
    }

    switch (incoming.__typename) {
      case "GetEntriesSuccess": {
        // We have existing data = merge both existing and incoming data
        if (existing.__typename === "GetEntriesSuccess") {
          const edgesExisting = (existing.entries.edges ||
            []) as GetEntriesUnionFragment_GetEntriesSuccess_entries_edges[];

          const edgesIncoming = (incoming.entries.edges ||
            []) as GetEntriesUnionFragment_GetEntriesSuccess_entries_edges[];

          return {
            ...incoming,
            entries: {
              ...incoming.entries,
              edges: [...edgesExisting, ...edgesIncoming],
            },
          };
        } else {
          // If we have existing errors, the incoming data will make these
          // errors mute
          return incoming;
        }
      }

      case "GetEntriesErrors": {
        // Since we have existing entries data, augment it with newly received
        // errors
        if (existing.__typename === "GetEntriesSuccess") {
          return {
            ...existing,
            errors: incoming.errors,
          };
        }

        // else, since both existing and incoming have errors, return the
        // latest errors from incoming
        return incoming;
      }
    }
  },

  read(existing) {
    if (!existing) {
      return existing;
    }

    return existing;
  },
};

export type EntriesCacheUnion =
  | GetEntriesUnionFragment_GetEntriesErrors
  | EntriesCacheSuccessMayBeWithErrors;

type EntriesCacheSuccessMayBeWithErrors =
  GetEntriesUnionFragment_GetEntriesSuccess & {
    error?: GetEntriesUnionFragment_GetEntriesErrors["errors"];
  };
