/* istanbul ignore file */
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "../graphql/apollo-types/EntryConnectionFragment";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { ExperienceCompleteFragment } from "../graphql/apollo-types/ExperienceCompleteFragment";
import {
  GetEntriesDetailView,
  GetEntriesDetailViewVariables,
} from "../graphql/apollo-types/GetEntriesDetailView";
import { GetEntriesUnionFragment } from "../graphql/apollo-types/GetEntriesUnionFragment";
import {
  GetExperienceDetailView,
  GetExperienceDetailViewVariables,
} from "../graphql/apollo-types/GetExperienceDetailView";
import { ENTRY_FRAGMENT } from "../graphql/entry.gql";
import {
  EXPERIENCE_COMPLETE_FRAGMENT,
  FRAGMENT_NAME_experienceCompleteFragment,
  GET_ENTRIES_DETAIL_VIEW_QUERY,
  GET_EXPERIENCE_DETAIL_VIEW_QUERY,
} from "../graphql/experience.gql";
import { emptyPageInfo } from "../graphql/utils.gql";
import { GetExperienceAndEntriesDetailViewQueryResult } from "./experience.gql.types";
import { makeApolloCacheRef } from "./resolvers";

export function writeCachedExperienceCompleteFragment(
  experience: ExperienceCompleteFragment,
) {
  const { id } = experience;
  const { cache } = window.____ebnis;

  cache.writeFragment({
    fragment: EXPERIENCE_COMPLETE_FRAGMENT,
    fragmentName: FRAGMENT_NAME_experienceCompleteFragment,
    id: makeApolloCacheRef("Experience", id),
    data: experience,
  });
}

export function readExperienceCompleteFragment(experienceId: string) {
  const { cache } = window.____ebnis;

  const experience = cache.readFragment<ExperienceCompleteFragment>({
    id: makeApolloCacheRef("Experience", experienceId),
    fragment: EXPERIENCE_COMPLETE_FRAGMENT,
    fragmentName: "ExperienceCompleteFragment",
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

export function writeGetExperienceDetailViewQueryToCache(
  experience: ExperienceCompleteFragment,
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

export function writeCachedEntriesDetailView(
  experienceId: string,
  entriesUnionFragment: GetEntriesUnionFragment,
) {
  const { cache } = window.____ebnis;

  return cache.writeQuery<GetEntriesDetailView, GetEntriesDetailViewVariables>({
    query: GET_ENTRIES_DETAIL_VIEW_QUERY,
    data: {
      getEntries: entriesUnionFragment,
    },
    variables: {
      experienceId,
      pagination: {
        first: 10,
      },
    },
  });
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
