import {
  EntryConnectionFragment_edges_node,
  EntryConnectionFragment_edges,
} from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";

export function entryToEdge(
  entry: EntryConnectionFragment_edges_node,
): EntryConnectionFragment_edges {
  return {
    node: entry,
    cursor: "",
    __typename: "EntryEdge" as "EntryEdge",
  };
}
