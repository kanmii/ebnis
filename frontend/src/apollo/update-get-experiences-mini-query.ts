import update from "immutability-helper";
import { DataProxy, InMemoryCache } from "@apollo/client";
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import {
  GetExperienceConnectionMini,
  GetExperienceConnectionMiniVariables,
  GetExperienceConnectionMini_getExperiences,
} from "../graphql/apollo-types/GetExperienceConnectionMini";
import immer from "immer";
import {
  ExperienceConnectionFragment_edges,
  ExperienceConnectionFragment_edges_node,
} from "../graphql/apollo-types/ExperienceConnectionFragment";
import { ExperienceMiniFragment } from "../graphql/apollo-types/ExperienceMiniFragment";
import {
  getExperiencesMiniQuery,
  readOptions,
  makeGetExperienceApolloCacheKey,
} from "./get-experiences-mini-query";
import { readExperienceFragment } from "./read-experience-fragment";
import { DataDefinitionFragment } from "../graphql/apollo-types/DataDefinitionFragment";
import { EntryConnectionFragment } from "../graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { DataObjectFragment } from "../graphql/apollo-types/DataObjectFragment";

export function makeDefaultExperienceMiniConnection(): GetExperienceConnectionMini_getExperiences {
  return {
    pageInfo: {
      __typename: "PageInfo",
      hasNextPage: false,
      hasPreviousPage: false,
    },
    __typename: "ExperienceConnection",
    edges: [],
  };
}

export function insertExperienceInGetExperiencesMiniQuery(
  experience: ExperienceFragment,
  { force }: { force?: boolean } = {},
) {
  const queriedExperienceConnection = getExperiencesMiniQuery();

  if (!queriedExperienceConnection && !force) {
    return;
  }

  const { cache } = window.____ebnis;

  const experienceConnection =
    queriedExperienceConnection || makeDefaultExperienceMiniConnection();

  const updated = update(experienceConnection, {
    edges: {
      $unshift: [
        {
          node: experience,
          cursor: "",
          __typename: "ExperienceEdge",
        },
      ],
    },
  });

  // const updatedExperienceConnection = immer(experienceConnection, (proxy) => {
  //   const edges = proxy.edges || [];
  //   debugger

  //   edges.unshift({
  //     node: experience,
  //     cursor: "",
  //     __typename: "ExperienceEdge",
  //   });

  //   proxy.edges = edges;
  // });

  cache.writeQuery<
    GetExperienceConnectionMini,
    GetExperienceConnectionMiniVariables
  >({
    ...readOptions,
    data: { getExperiences: updated },
  });
}

export function insertExperiencesInGetExperiencesMiniQuery(
  dataProxy: DataProxy,
  experiences: (ExperienceMiniFragment | null)[],
) {
  const experienceConnection =
    getExperiencesMiniQuery() || makeDefaultExperienceMiniConnection();

  const updatedExperienceConnection = immer(experienceConnection, (proxy) => {
    const edges = (proxy.edges || []) as ExperienceConnectionFragment_edges[];

    proxy.edges = experiences
      .map((e) => {
        return {
          node: e,
          cursor: "",
          __typename: "ExperienceEdge" as "ExperienceEdge",
        } as ExperienceConnectionFragment_edges;
      })
      .concat(edges);
  });

  dataProxy.writeQuery<
    GetExperienceConnectionMini,
    GetExperienceConnectionMiniVariables
  >({
    ...readOptions,
    data: { getExperiences: updatedExperienceConnection },
  });
}

export function floatExperienceToTheTopInGetExperiencesMiniQuery(
  experience: ExperienceMiniFragment,
) {
  const { cache } = window.____ebnis;

  const experienceConnection =
    getExperiencesMiniQuery() || makeDefaultExperienceMiniConnection();

  const edges = (experienceConnection.edges ||
    []) as ExperienceConnectionFragment_edges[];

  const newEdges: ExperienceConnectionFragment_edges[] = [
    {} as ExperienceConnectionFragment_edges,
  ];

  let experienceEdge = (undefined as unknown) as ExperienceConnectionFragment_edges;

  edges.forEach((e) => {
    const edge = e as ExperienceConnectionFragment_edges;
    const node = edge.node as ExperienceConnectionFragment_edges_node;

    if (node.id === experience.id) {
      experienceEdge = edge;
    } else {
      newEdges.push(edge);
    }
  });

  newEdges[0] =
    experienceEdge ||
    ({
      node: experience,
      cursor: "",
      __typename: "ExperienceEdge",
    } as ExperienceConnectionFragment_edges);

  cache.writeQuery<
    GetExperienceConnectionMini,
    GetExperienceConnectionMiniVariables
  >({
    ...readOptions,
    data: { getExperiences: { ...experienceConnection, edges: newEdges } },
  });
}

export function floatExperiencesToTopInGetExperiencesMiniQuery(ids: {
  [k: string]: number;
}) {
  const { cache } = window.____ebnis;

  const experienceConnection = getExperiencesMiniQuery();

  if (!experienceConnection) {
    return;
  }

  const updatedExperienceConnection = immer(experienceConnection, (proxy) => {
    const edges = (proxy.edges || []) as ExperienceConnectionFragment_edges[];

    // 5 is an arbitrary number, we just need len > edges.length
    const len = edges.length + 5;

    proxy.edges = edges.sort((a, b) => {
      const id1 = ((a as ExperienceConnectionFragment_edges)
        .node as ExperienceConnectionFragment_edges_node).id;

      const id2 = ((b as ExperienceConnectionFragment_edges)
        .node as ExperienceConnectionFragment_edges_node).id;

      return (ids[id1] || len) - (ids[id2] || len);
    });
  });

  cache.writeQuery<
    GetExperienceConnectionMini,
    GetExperienceConnectionMiniVariables
  >({
    ...readOptions,
    data: { getExperiences: updatedExperienceConnection },
  });
}

/**
 * When null is supplied in the map, it means the experience will be removed
 * from the query
 */
export function replaceOrRemoveExperiencesInGetExperiencesMiniQuery(experiencesMap: {
  [k: string]: ExperienceFragment | null;
}) {
  const { client } = window.____ebnis;

  const experiences =
    getExperiencesMiniQuery() || makeDefaultExperienceMiniConnection();

  const updatedExperienceConnection = immer(experiences, (proxy) => {
    const edges = (proxy.edges || []) as ExperienceConnectionFragment_edges[];
    const newEdges: ExperienceConnectionFragment_edges[] = [];

    for (let edge of edges) {
      edge = edge as ExperienceConnectionFragment_edges;
      const node = edge.node as ExperienceConnectionFragment_edges_node;
      const replacementExperience = experiencesMap[node.id];

      // value is null, so skip ==== delete.
      if (replacementExperience === null) {
        continue;
      }

      if (replacementExperience) {
        edge.node = replacementExperience;
      }

      newEdges.push(edge);
    }

    proxy.edges = newEdges;
  });

  client.writeQuery<
    GetExperienceConnectionMini,
    GetExperienceConnectionMiniVariables
  >({
    ...readOptions,
    data: { getExperiences: updatedExperienceConnection },
  });
}

export function purgeExperiencesFromCache(ids: string[]) {
  const cache = window.____ebnis.cache;
  const dataProxy = cache as any;
  const data = dataProxy.data.data;
  const dataKeys = Object.keys(data);

  const experiencesMiniQuery = getExperiencesMiniQuery();
  const edgesLen =
    (experiencesMiniQuery &&
      experiencesMiniQuery.edges &&
      experiencesMiniQuery.edges.length) ||
    -1;

  const miniQueryKeyPart = `$ROOT_QUERY.getExperiences({"input":{"pagination":{"first":20000}}}).edges.`;
  const miniQueryKeys: string[] = [];

  dataKeys.forEach((key) => {
    for (const id of ids) {
      if (key.startsWith(id)) {
        delete data[key];
        break;
      }
    }

    if (key.startsWith(miniQueryKeyPart)) {
      miniQueryKeys.push(key);
    }
  });

  if (edgesLen > 0) {
    const pattern = /\.(\d+)$/;

    miniQueryKeys.forEach((key) => {
      const patternExec = pattern.exec(key) as RegExpExecArray;

      const index = +patternExec[1];
      if (index >= edgesLen) {
        delete data[key];
      }
    });
  }

  dataProxy.broadcastWatches();
}

export function purgeExperiencesFromCache1(ids: string[]) {
  const experiencesMini = getExperiencesMiniQuery();

  if (!experiencesMini) {
    return;
  }

  const { cache } = window.____ebnis;
  const dataProxy = cache as any;
  const data = dataProxy.data.data;

  const idsMap = ids.reduce((accId, id) => {
    accId[id] = true;
    return accId;
  }, {} as { [key: string]: true });

  const updatedExperienceConnection = immer(experiencesMini, (proxy) => {
    const edges = (proxy.edges || []) as ExperienceConnectionFragment_edges[];
    const newEdges: ExperienceConnectionFragment_edges[] = [];

    for (let edge of edges) {
      edge = edge as ExperienceConnectionFragment_edges;
      const node = edge.node as ExperienceConnectionFragment_edges_node;

      const id = node.id;
      const idFound = idsMap[id];

      if (idFound) {
        purgeExperience(id, data, cache);

        // we are deleting this experience from this list
        continue;
      }

      // the rest of the experience mini will be rewritten to the cache
      newEdges.push(edge);
    }

    proxy.edges = newEdges;
  });

  cache.writeQuery<
    GetExperienceConnectionMini,
    GetExperienceConnectionMiniVariables
  >({
    ...readOptions,
    data: { getExperiences: updatedExperienceConnection },
  });

  dataProxy.broadcastWatches();
}

function purgeExperience(
  experienceId: string,
  data: any,
  cache: InMemoryCache,
) {
  const toDelete = `Experience:${experienceId}`;

  try {
    const experience = readExperienceFragment(experienceId);

    if (experience) {
      const { dataDefinitions, entries } = experience;

      if (dataDefinitions) {
        dataDefinitions.forEach((d) => {
          const id = (d as DataDefinitionFragment).id;
          delete data[`DataDefinition:${id}`];
        });
      }

      if (entries) {
        purgeEntries(entries, data);
      }
    }
  } catch (error) {}

  delete data[toDelete];
  delete data.ROOT_QUERY[makeGetExperienceApolloCacheKey(experienceId)];
}

function purgeEntries(entries: EntryConnectionFragment, data: any) {
  const edges = entries.edges;

  if (!edges) {
    return;
  }

  edges.forEach((edge, index) => {
    const entry = (edge && edge.node) as EntryFragment;
    const entryId = entry.id;

    entry.dataObjects.forEach((d) => {
      const id = (d as DataObjectFragment).id;
      delete data[`DataObject:${id}`];
    });

    delete data[`Entry:${entryId}`];
  });
}
