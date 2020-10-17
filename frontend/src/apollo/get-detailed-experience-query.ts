/* istanbul ignore file */
import { ExperienceFragment } from "../graphql/apollo-types/ExperienceFragment";
import { EXPERIENCE_FRAGMENT } from "../graphql/experience.gql";
import { makeApolloCacheRef } from "./resolvers";
import {
  GetExperience,
  GetExperienceVariables,
} from "../graphql/apollo-types/GetExperience";
import { GET_EXPERIENCE_QUERY } from "../graphql/experience.gql";
import { DetailedExperienceQueryResult } from "../utils/experience.gql.types";
import { GET_ENTRIES_QUERY } from "../graphql/experience.gql";
import {
  GetEntries,
  GetEntriesVariables,
} from "../graphql/apollo-types/GetEntries";
import {
  EntryConnectionFragment,
  EntryConnectionFragment_edges,
} from "../graphql/apollo-types/EntryConnectionFragment";
import { emptyPageInfo } from "../graphql/utils.gql";
import { GetEntriesUnionFragment } from "../graphql/apollo-types/GetEntriesUnionFragment";
import { EntryFragment } from "../graphql/apollo-types/EntryFragment";
import { ENTRY_FRAGMENT } from "../graphql/entry.gql";

export function writeExperienceFragmentToCache(experience: ExperienceFragment) {
  const { id } = experience;
  const { cache } = window.____ebnis;

  cache.writeFragment({
    fragment: EXPERIENCE_FRAGMENT,
    fragmentName: "ExperienceFragment",
    id: makeApolloCacheRef("Experience", id),
    data: experience,
  });
}

export function readExperienceFragment(experienceId: string) {
  const { cache } = window.____ebnis;

  const experience = cache.readFragment<ExperienceFragment>({
    id: makeApolloCacheRef("Experience", experienceId),
    fragment: EXPERIENCE_FRAGMENT,
    fragmentName: "ExperienceFragment",
  });

  return experience;
}

export function sammelnZwischengespeicherteErfahrung(erfahrungId: string) {
  const getExperience = getExperienceQuery(erfahrungId);

  if (!getExperience) {
    return;
  }

  const getEntries = getEntriesQuery(erfahrungId);

  return {
    data: {
      getExperience,
      getEntries,
    },
  } as DetailedExperienceQueryResult;
}

export function writeGetExperienceQueryToCache(experience: ExperienceFragment) {
  const { cache } = window.____ebnis;
  const { id } = experience;

  cache.writeQuery<GetExperience, GetExperienceVariables>({
    query: GET_EXPERIENCE_QUERY,
    data: {
      getExperience: experience,
    },
    variables: {
      id,
    },
  });
}

export function getEntriesQuery(experienceId: string) {
  const { cache } = window.____ebnis;

  try {
    const data = cache.readQuery<GetEntries, GetEntriesVariables>({
      query: GET_ENTRIES_QUERY,
      variables: {
        experienceId,
        pagination: {
          first: 10,
        },
      },
    });

    return (data && data.getEntries) || undefined;
  } catch (error) {}

  return undefined;
}

export function getEntriesQuerySuccess(experienceId: string) {
  const getEntries = getEntriesQuery(experienceId);

  if (getEntries && getEntries.__typename === "GetEntriesSuccess") {
    return getEntries.entries;
  }

  return {
    edges: [] as EntryConnectionFragment_edges[],
    pageInfo: emptyPageInfo,
  } as EntryConnectionFragment;
}

export function writeGetEntriesQuery(
  experienceId: string,
  entriesUnionFragment: GetEntriesUnionFragment,
) {
  const { cache } = window.____ebnis;

  return cache.writeQuery<GetEntries, GetEntriesVariables>({
    query: GET_ENTRIES_QUERY,
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

export function getExperienceQuery(erfahrungId: string) {
  const { cache } = window.____ebnis;

  try {
    const daten = cache.readQuery<GetExperience, GetExperienceVariables>({
      query: GET_EXPERIENCE_QUERY,
      variables: {
        id: erfahrungId,
      },
    });

    return (daten && daten.getExperience) || undefined;
  } catch (error) {}

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
