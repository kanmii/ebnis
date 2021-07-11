/* istanbul ignore file */
import { makeReference, Reference } from "@apollo/client";
import { Modifier } from "@apollo/client/cache/core/types/common";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "../graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { ExperienceDCFragment } from "../graphql/apollo-types/ExperienceDCFragment";
import { ExperienceListViewFragment } from "../graphql/apollo-types/ExperienceListViewFragment";
import {
  GetEntriesDetailView,
  GetEntriesDetailViewVariables,
  GetEntriesDetailView_getEntries_GetEntriesErrors,
  GetEntriesDetailView_getEntries_GetEntriesSuccess,
  GetEntriesDetailView_getEntries_GetEntriesSuccess_entries,
} from "../graphql/apollo-types/GetEntriesDetailView";
import { GetEntriesUnionFragment } from "../graphql/apollo-types/GetEntriesUnionFragment";
import {
  GetExperienceDetailView,
  GetExperienceDetailViewVariables,
} from "../graphql/apollo-types/GetExperienceDetailView";
import {
  ENTRY_FRAGMENT,
  FRAGMENT_NAME_entryFragment,
} from "../graphql/entry.gql";
import {
  EXPERIENCE_DC_FRAGMENT,
  EXPERIENCE_D_FRAGMENT,
  EXPERIENCE_LIST_VIEW_FRAGMENT,
  FRAGMENT_NAME_experienceDCFragment,
  FRAGMENT_NAME_experienceDFragment,
  FRAGMENT_NAME_experienceListViewFragment,
  GET_ENTRIES_DETAIL_VIEW_QUERY,
  GET_EXPERIENCE_DETAIL_VIEW_QUERY,
} from "../graphql/experience.gql";
import { emptyPageInfo } from "../graphql/utils.gql";
import { GetExperienceAndEntriesDetailViewQueryResult } from "./experience.gql.types";
import { makeApolloCacheRef } from "./resolvers";

export function writeExperienceDCFragment(experience: ExperienceDCFragment) {
  const { id } = experience;
  const { cache } = window.____ebnis;

  return cache.writeFragment({
    fragment: EXPERIENCE_DC_FRAGMENT,
    fragmentName: FRAGMENT_NAME_experienceDCFragment,
    id: makeApolloCacheRef("Experience", id),
    data: experience,
  });
}

export function writeExperienceListViewFragment(
  experience: ExperienceListViewFragment,
) {
  const { id } = experience;
  const { cache } = window.____ebnis;

  return cache.writeFragment({
    fragment: EXPERIENCE_LIST_VIEW_FRAGMENT,
    fragmentName: FRAGMENT_NAME_experienceListViewFragment,
    id: makeApolloCacheRef("Experience", id),
    data: experience,
  });
}

export function readExperienceDCFragment(experienceId: string) {
  const { cache } = window.____ebnis;

  const experience = cache.readFragment<ExperienceDCFragment>({
    id: makeApolloCacheRef("Experience", experienceId),
    fragment: EXPERIENCE_DC_FRAGMENT,
    fragmentName: FRAGMENT_NAME_experienceDCFragment,
  });

  return experience;
}

export function readExperienceDFragment(experienceId: string) {
  const { cache } = window.____ebnis;

  const experience = cache.readFragment<ExperienceDCFragment>({
    id: makeApolloCacheRef("Experience", experienceId),
    fragment: EXPERIENCE_D_FRAGMENT,
    fragmentName: FRAGMENT_NAME_experienceDFragment,
  });

  return experience;
}

export function getCachedExperienceAndEntriesDetailView(erfahrungId: string) {
  const getExperience = getCachedExperienceDetailView(erfahrungId);

  if (!getExperience) {
    return;
  }

  const getEntries = getCachedEntriesDetailView(erfahrungId);

  return {
    data: {
      getExperience,
      getEntries,
    },
  } as GetExperienceAndEntriesDetailViewQueryResult;
}

export type GetCachedExperienceAndEntriesDetailViewInjectType = {
  getCachedExperienceAndEntriesDetailViewInject: typeof getCachedExperienceAndEntriesDetailView;
};

export function writeGetExperienceDetailViewQueryToCache(
  experience: ExperienceDCFragment,
) {
  const { cache } = window.____ebnis;
  const { id } = experience;

  cache.writeQuery<GetExperienceDetailView, GetExperienceDetailViewVariables>({
    query: GET_EXPERIENCE_DETAIL_VIEW_QUERY,
    data: {
      getExperience: experience,
    },
    variables: {
      id,
    },
  });
}

export function getCachedEntriesDetailView(experienceId: string) {
  const { cache } = window.____ebnis;

  try {
    const data = cache.readQuery<
      GetEntriesDetailView,
      GetEntriesDetailViewVariables
    >({
      query: GET_ENTRIES_DETAIL_VIEW_QUERY,
      variables: {
        experienceId,
        pagination: {
          first: 10,
        },
      },
    });

    return (data && data.getEntries) || undefined;
  } catch (error) {
    //
  }

  return undefined;
}

export function getCachedEntriesDetailViewSuccess(experienceId: string) {
  const getEntries = getCachedEntriesDetailView(experienceId);

  if (getEntries && getEntries.__typename === "GetEntriesSuccess") {
    return getEntries.entries;
  }

  return {
    edges: [] as EntryConnectionFragment_edges[],
    pageInfo: emptyPageInfo,
  } as EntryConnectionFragment;
}

export type GetCachedEntriesDetailViewSuccessInjectType = {
  getCachedEntriesDetailViewSuccessInject: typeof getCachedEntriesDetailViewSuccess;
};

function writeEntryFragment(entry: EntryFragment) {
  const { id } = entry;
  const { cache } = window.____ebnis;

  return cache.writeFragment({
    fragment: ENTRY_FRAGMENT,
    fragmentName: FRAGMENT_NAME_entryFragment,
    id: makeApolloCacheRef("Entry", id),
    data: entry,
  });
}

export function writeCachedEntriesDetailView(
  experienceId: string,
  entriesUnionFragment: GetEntriesUnionFragment,
  { replaceAll }: { replaceAll?: true } = {},
) {
  if (entriesUnionFragment.__typename === "GetEntriesErrors") {
    return;
  }

  let modified = false;

  const { cache } = window.____ebnis;

  const modifyFn: Modifier<GetEntriesStoreObject> = (
    conn,
    { storeFieldName },
  ) => {
    if (!storeFieldName.includes(experienceId)) {
      return conn;
    }

    let connSuccess = { ...conn } as GetEntriesSuccessStoreObject;

    if (conn.__typename === "GetEntriesErrors") {
      connSuccess = {
        entries: {
          edges: [],
          pageInfo: emptyPageInfo,
          __typename: "EntryConnection",
        },
        __typename: "GetEntriesSuccess",
      };
    }

    modified = true;

    const incomingEdges = (
      (entriesUnionFragment.entries.edges ||
        []) as EntryConnectionFragment_edges[]
    ).reduce((acc, edge) => {
      const node = edge.node as EntryFragment;
      const entryRef = writeEntryFragment(node) as Reference;

      const newEdge: EntryEdgeStoreObject = {
        node: entryRef,
        cursor: "",
        __typename: "EntryEdge",
      };

      acc.push(newEdge);
      return acc;
    }, [] as EntryEdgeStoreObject[]);

    if (!incomingEdges.length) {
      return conn;
    }

    const entries = { ...connSuccess.entries };
    connSuccess.entries = entries;

    const existingEdges = replaceAll ? [] : entries.edges || [];
    entries.edges = incomingEdges.concat(...existingEdges);

    return connSuccess;
  };

  cache.modify({
    id: cache.identify(makeReference("ROOT_QUERY")),
    fields: {
      getEntries: modifyFn,
    },
  });

  if (!modified) {
    cache.writeQuery<GetEntriesDetailView, GetEntriesDetailViewVariables>({
      query: GET_ENTRIES_DETAIL_VIEW_QUERY,
      data: {
        getEntries: entriesUnionFragment,
      },
      variables: {
        experienceId,
      } as GetEntriesDetailViewVariables,
    });
  }
}

export function getCachedExperienceDetailView(erfahrungId: string) {
  const { cache } = window.____ebnis;

  try {
    const daten = cache.readQuery<
      GetExperienceDetailView,
      GetExperienceDetailViewVariables
    >({
      query: GET_EXPERIENCE_DETAIL_VIEW_QUERY,
      variables: {
        id: erfahrungId,
      },
    });

    return (daten && daten.getExperience) || undefined;
  } catch (error) {
    //
  }

  return undefined;
}

export type GetCachedExperienceDetailViewInjectType = {
  getCachedExperienceDetailViewInject: typeof getCachedExperienceDetailView;
};

export function erzeugenSammelnEinträgenAbfrage(erfahrungId: string) {
  return `getEntries({"experienceId":"${erfahrungId}"})`;
}

export function readEntryFragment(entryId: string) {
  const { cache } = window.____ebnis;

  const entry = cache.readFragment<EntryFragment>({
    id: makeApolloCacheRef("Entry", entryId),
    fragment: ENTRY_FRAGMENT,
    fragmentName: "EntryFragment",
  });

  return entry;
}

export type ReadEntryFragmentInjectType = {
  readEntryFragmentInject: typeof readEntryFragment;
};

type GetEntriesSuccessStoreObject = Pick<
  GetEntriesDetailView_getEntries_GetEntriesSuccess,
  "__typename"
> & {
  entries: Pick<
    GetEntriesDetailView_getEntries_GetEntriesSuccess_entries,
    "__typename" | "pageInfo"
  > & {
    edges: EntryEdgeStoreObject[];
  };
};

type GetEntriesStoreObject =
  | GetEntriesSuccessStoreObject
  | GetEntriesDetailView_getEntries_GetEntriesErrors;

type EntryEdgeStoreObject = {
  __typename: "EntryEdge";
  cursor: string;
  node: Reference;
};
