import {
  writeCachedEntriesDetailView,
  writeGetExperienceDetailViewQueryToCache,
} from "@eb/shared/src/apollo/experience-detail-cache-utils";
import { preFetchExperiences } from "@eb/shared/src/apollo/pre-fetch-experiences.gql";
import { EntryConnectionFragment } from "@eb/shared/src/graphql/apollo-types/EntryConnectionFragment";
import { ExperienceDCFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDCFragment";
import { ExperienceListViewFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceListViewFragment";
import { toGetEntriesSuccessQuery } from "@eb/shared/src/graphql/utils.gql";

// istanbul ignore next:
export async function handlePreFetchExperiences(
  erfahrungenIds: string[],
  idToExperienceMap: {
    [experienceId: string]: ExperienceListViewFragment;
  },
) {
  if (!erfahrungenIds.length) {
    return;
  }

  const result = await preFetchExperiences({
    ids: erfahrungenIds,
    entryPagination: {
      first: 10,
    },
  });

  const experiences = result && result.data && result.data.preFetchExperiences;

  if (!experiences) {
    return;
  }

  experiences.forEach((experience) => {
    if (!experience) {
      return;
    }

    const { id: experienceId } = experience;

    const combinedExperienceData = {
      ...idToExperienceMap[experienceId],
      ...experience,
    };

    const entryConnection = experience.entries as EntryConnectionFragment;

    writeGetExperienceDetailViewQueryToCache(
      combinedExperienceData as unknown as ExperienceDCFragment,
    );

    writeCachedEntriesDetailView(
      experienceId,
      toGetEntriesSuccessQuery(entryConnection),
    );
  });
}

export type HandlePreFetchExperiencesInjectType = {
  handlePreFetchExperiencesInject: typeof handlePreFetchExperiences;
};
