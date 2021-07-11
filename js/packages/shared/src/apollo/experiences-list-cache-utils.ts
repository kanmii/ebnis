import { makeReference, Reference } from "@apollo/client";
import { Modifier } from "@apollo/client/cache/core/types/common";
import { DataDefinitionFragment } from "@eb/shared/src/graphql/apollo-types/DataDefinitionFragment";
import { DataObjectFragment } from "@eb/shared/src/graphql/apollo-types/DataObjectFragment";
import { EntryConnectionFragment } from "@eb/shared/src/graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "@eb/shared/src/graphql/apollo-types/EntryFragment";
import { ExperienceConnectionFragment_edges } from "@eb/shared/src/graphql/apollo-types/ExperienceConnectionFragment";
import { ExperienceDCFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDCFragment";
import { ExperienceListViewFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceListViewFragment";
import {
  GetExperiencesConnectionListView,
  GetExperiencesConnectionListViewVariables,
  GetExperiencesConnectionListView_getExperiences,
  GetExperiencesConnectionListView_getExperiences_edges,
} from "@eb/shared/src/graphql/apollo-types/GetExperiencesConnectionListView";
import { PageInfoFragment } from "@eb/shared/src/graphql/apollo-types/PageInfoFragment";
import { emptyPageInfo } from "@eb/shared/src/graphql/utils.gql";
import { Any, OfflineIdToOnlineExperienceMap } from "../utils/types";
import {
  makeGetExperienceApolloCacheKey,
  readOptions,
} from "./cached-experiences-list-view";
import {
  erzeugenSammelnEinträgenAbfrage,
  getCachedEntriesDetailViewSuccess,
  readExperienceDFragment,
  writeExperienceDCFragment,
  writeExperienceListViewFragment,
} from "./experience-detail-cache-utils";

export function makeDefaultExperienceMiniConnection(): GetExperiencesConnectionListView_getExperiences {
  return {
    pageInfo: emptyPageInfo,
    __typename: "ExperienceConnection",
    edges: [],
  };
}

function writeGetExperiencesListViewQuery(data: {
  edges: GetExperiencesConnectionListView_getExperiences_edges[];
  pageInfo: PageInfoFragment;
}) {
  const { cache } = window.____ebnis;

  cache.writeQuery<
    GetExperiencesConnectionListView,
    GetExperiencesConnectionListViewVariables
  >({
    ...readOptions,
    data: {
      getExperiences: {
        ...data,
        __typename: "ExperienceConnection",
      },
    },
  });
}

export function floatExperienceToTopInGetExperiencesListViewQuery(
  experience: ExperienceListViewFragment,
) {
  const { cache } = window.____ebnis;

  const modifyFn: Modifier<GetExperiencesStoreObject> = (
    conn,
    { readField },
  ) => {
    conn = conn || emptyGetExperiencesStoreObject;

    conn = {
      ...conn,
    };

    const edges = (conn.edges || []) as ExperienceEdgeStoreObject[];

    let updatedEdge = undefined as unknown as ExperienceEdgeStoreObject;

    const newEdges: ExperienceEdgeStoreObject[] = [
      {} as ExperienceEdgeStoreObject,
    ];

    edges.forEach((edge) => {
      const nodeRef = readField("node", edge) as Reference;
      const nodeId = readField("id", nodeRef);

      if (nodeId === experience.id) {
        updatedEdge = edge;
      } else {
        newEdges.push(edge);
      }
    });

    if (!updatedEdge) {
      const newNodeRef = writeExperienceListViewFragment(
        experience,
      ) as Reference;

      const newEdge: ExperienceEdgeStoreObject = {
        node: newNodeRef,
        cursor: "",
        __typename: "ExperienceEdge",
      };

      updatedEdge = newEdge;
    }

    newEdges[0] = updatedEdge;
    conn.edges = newEdges;

    return conn;
  };

  const modified = cache.modify({
    id: cache.identify(makeReference("ROOT_QUERY")),
    fields: {
      getExperiences: modifyFn,
    },
  });

  if (!modified) {
    writeGetExperiencesListViewQuery({
      pageInfo: emptyPageInfo,
      edges: [
        {
          node: experience,
          cursor: "",
          __typename: "ExperienceEdge",
        } as ExperienceConnectionFragment_edges,
      ],
    });
  }
}

const emptyGetExperiencesStoreObject: GetExperiencesStoreObject = {
  __typename: "ExperienceConnection",
  edges: [],
  pageInfo: emptyPageInfo,
};

export function upsertExperiencesInGetExperiencesListView(
  experiencesList: [string, ExperienceDCFragment][],
) {
  const { cache } = window.____ebnis;

  const modifierFn: Modifier<GetExperiencesStoreObject> = (
    connection,
    { readField, toReference },
  ) => {
    connection = connection || emptyGetExperiencesStoreObject;

    connection = {
      ...connection,
    };

    const currentEdges = (connection.edges ||
      []) as ExperienceEdgeStoreObject[];

    const idsToEdgesMinusCreatedOrUpdatedMap = currentEdges.reduce(
      (edgesAcc, edge) => {
        const nodeRef = readField("node", edge) as Reference;

        const id = readField("id", nodeRef) as string;

        edgesAcc[id] = edge;

        return edgesAcc;
      },
      {} as { [experienceId: string]: ExperienceEdgeStoreObject },
    );

    const createdOrUpdatedEdges: ExperienceEdgeStoreObject[] = [];

    experiencesList.forEach(([experienceId, experience]) => {
      const existingEdge = idsToEdgesMinusCreatedOrUpdatedMap[experienceId];

      if (existingEdge) {
        const experienceRef = toReference(
          experience as unknown as Reference,
        ) as Reference;

        existingEdge.node = experienceRef;
        createdOrUpdatedEdges.push(existingEdge);
        delete idsToEdgesMinusCreatedOrUpdatedMap[experienceId];
      } else {
        const newNodeRef = writeExperienceDCFragment(experience) as Reference;

        const newEdge: ExperienceEdgeStoreObject = {
          node: newNodeRef,
          cursor: "",
          __typename: "ExperienceEdge",
        };

        createdOrUpdatedEdges.push(newEdge);
      }

      delete idsToEdgesMinusCreatedOrUpdatedMap[experienceId];
    });

    connection.edges = createdOrUpdatedEdges.concat(
      Object.values(idsToEdgesMinusCreatedOrUpdatedMap),
    );
    return connection;
  };

  const modified = cache.modify({
    id: cache.identify(makeReference("ROOT_QUERY")),
    fields: {
      getExperiences: modifierFn,
    },
  });

  // If not modifiable, then it means `getExperiences` query has never been ran
  // - e.g. if we are accessing the ExperienceDetail view directly from
  // end-to-end test

  if (!modified) {
    writeGetExperiencesListViewQuery({
      pageInfo: emptyPageInfo,
      edges: experiencesList.map(([, experience]) => {
        return {
          node: experience,
          cursor: "",
          __typename: "ExperienceEdge",
        } as ExperienceConnectionFragment_edges;
      }),
    });
  }
}

export function purgeExperiencesFromCache(ids: string[]) {
  const { cache } = window.____ebnis;

  const idsMap = ids.reduce((accId, id) => {
    accId[id] = true;
    return accId;
  }, {} as { [key: string]: true });

  const modifyFn: Modifier<GetExperiencesStoreObject> = (
    conn,
    { readField },
  ) => {
    conn = {
      ...conn,
    };

    const edges = (conn.edges || []) as ExperienceEdgeStoreObject[];

    const newEdges: ExperienceEdgeStoreObject[] = [];

    for (const edge of edges) {
      const nodeRef = readField("node", edge) as Reference;
      const id = readField("id", nodeRef) as string;
      const idFound = idsMap[id];

      if (idFound) {
        purgeExperience(id);

        // we are deleting this experience from this list
        continue;
      }

      // the rest will be rewritten to the cache
      newEdges.push(edge);
    }

    conn.edges = newEdges;

    return conn;
  };

  cache.modify({
    id: cache.identify(makeReference("ROOT_QUERY")),
    fields: {
      getExperiences: modifyFn,
    },
  });
}

export type PurgeExperiencesFromCacheInjectType = {
  purgeExperiencesFromCacheInject: typeof purgeExperiencesFromCache;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function purgeExperience(experienceId: string) {
  const { cache } = window.____ebnis;
  const dataProxy = cache as Any;
  const data = dataProxy.data.data;

  const toDelete = `Experience:${experienceId}`;

  try {
    const experience = readExperienceDFragment(experienceId);

    if (experience) {
      const { dataDefinitions } = experience;

      if (dataDefinitions) {
        dataDefinitions.forEach((d) => {
          const id = (d as DataDefinitionFragment).id;
          delete data[`DataDefinition:${id}`];
        });
      }

      const entries = getCachedEntriesDetailViewSuccess(experienceId);

      if (entries) {
        purgeEntries(entries);
        delete data.ROOT_QUERY[erzeugenSammelnEinträgenAbfrage(experienceId)];
      }
    }
  } catch (error) {
    //
  }

  delete data[toDelete];
  delete data.ROOT_QUERY[makeGetExperienceApolloCacheKey(experienceId)];
}

function purgeEntries(entries: EntryConnectionFragment) {
  const edges = entries.edges;

  if (!edges) {
    return;
  }

  edges.forEach((edge) => {
    const entry = (edge && edge.node) as EntryFragment;
    purgeEntry(entry);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function purgeEntry(entry: EntryFragment, data?: any) {
  if (!data) {
    const { cache } = window.____ebnis;
    const dataProxy = cache as Any;
    data = dataProxy.data.data;
  }

  const entryId = entry.id;

  entry.dataObjects.forEach((d) => {
    const id = (d as DataObjectFragment).id;
    delete data[`DataObject:${id}`];
  });

  delete data[`Entry:${entryId}`];
}

export type PurgeEntryInjectType = {
  purgeEntryInject: typeof purgeEntry;
};

export function deleteCacheKeys({
  wurzelSchlüssel,
  abfrageSchlüssel,
  veränderungSchlüssel,
}: {
  wurzelSchlüssel?: string[];
  abfrageSchlüssel?: string[];
  veränderungSchlüssel?: string[];
}) {
  const { cache } = window.____ebnis;
  const dataProxy = cache as Any;
  const data = dataProxy.data.data;

  if (wurzelSchlüssel) {
    wurzelSchlüssel.forEach((schlüssel) => {
      delete data[schlüssel];
    });
  }

  if (abfrageSchlüssel) {
    const abfrageDaten = data.ROOT_QUERY;

    abfrageSchlüssel.forEach((schlüssel) => {
      delete abfrageDaten[schlüssel];
    });
  }

  if (veränderungSchlüssel) {
    const veränderungDaten = data.ROOT_MUTATION;

    veränderungSchlüssel.forEach((schlüssel) => {
      delete veränderungDaten[schlüssel];
    });
  }
}
export async function cleanUpOfflineExperiences(
  data: OfflineIdToOnlineExperienceMap,
) {
  purgeExperiencesFromCache(Object.keys(data));
  const { persistor } = window.____ebnis;
  await persistor.persist();
}

export type CleanUpOfflineExperiencesInjectType = {
  cleanUpOfflineExperiencesInject: typeof cleanUpOfflineExperiences;
};

type ExperienceEdgeStoreObject = {
  __typename: "ExperienceEdge";
  cursor: string;
  node: Reference;
};

type GetExperiencesStoreObject = {
  __typename: "ExperienceConnection";
  edges: ExperienceEdgeStoreObject[];
  pageInfo: PageInfoFragment;
};
