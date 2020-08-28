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
 * When null is supplied in the array, it means the experience will be removed
 * from the query
 */
export function insertReplaceRemoveExperiencesInGetExperiencesMiniQuery(
  experiencesList: [string, ExperienceFragment | null][],
) {
  const { client } = window.____ebnis;

  const experiencesMini =
    getExperiencesMiniQuery() || makeDefaultExperienceMiniConnection();

  const updatedExperienceConnection = immer(experiencesMini, (proxy) => {
    const previousEdges = (proxy.edges ||
      []) as ExperienceConnectionFragment_edges[];

    const previousEdgesMap = previousEdges.reduce(
      (previousEdgesAcc, previousEdge) => {
        const experience = previousEdge.node as ExperienceMiniFragment;
        previousEdgesAcc[experience.id] = previousEdge;

        return previousEdgesAcc;
      },
      {} as { [experienceId: string]: ExperienceConnectionFragment_edges },
    );

    const newEdges: ExperienceConnectionFragment_edges[] = [];

    experiencesList.forEach(([experienceId, experienceMiniFragmentOrNull]) => {
      if (experienceMiniFragmentOrNull === null) {
        delete previousEdgesMap[experienceId];
        return;
      }

      const previousEdge = previousEdgesMap[experienceId];

      if (previousEdge) {
        previousEdge.node = experienceMiniFragmentOrNull;
        newEdges.push(previousEdge);
      } else {
        const newEdge = {
          node: experienceMiniFragmentOrNull,
          cursor: "",
          __typename: "ExperienceEdge" as "ExperienceEdge",
        } as ExperienceConnectionFragment_edges;

        newEdges.push(newEdge);
      }

      delete previousEdgesMap[experienceId];
    });

    proxy.edges = newEdges.concat(Object.values(previousEdgesMap));
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

  dataKeys.forEach((key) => {
    for (const id of ids) {
      if (key.startsWith(id)) {
        delete data[key];
        break;
      }
    }
  });

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
        purgeExperience(id, data);

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

export function purgeExperience(experienceId: string, data?: any) {
  if (!data) {
    const { cache } = window.____ebnis;
    const dataProxy = cache as any;
    data = dataProxy.data.data;
  }

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
