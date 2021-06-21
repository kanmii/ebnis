import {
  writeCachedEntriesDetailView,
  writeGetExperienceDetailViewQueryToCache,
} from "@eb/shared/src/apollo/get-detailed-experience-query";
import { preFetchExperiences } from "@eb/shared/src/apollo/pre-fetch-experiences.gql";
import { EntryConnectionFragment } from "@eb/shared/src/graphql/apollo-types/EntryConnectionFragment";
import { ExperienceCompleteFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceCompleteFragment";
import { ExperienceListViewFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceListViewFragment";
import { toGetEntriesSuccessQuery } from "@eb/shared/src/graphql/utils.gql";

// istanbul ignore next:
export function handlePreFetchExperiences(
  erfahrungenIds: string[],
  idToExperienceMap: {
    [experienceId: string]: ExperienceListViewFragment;
  },
) {
  preFetchExperiences({
    ids: erfahrungenIds,
    entryPagination: {
      first: 10,
    },
  }).then((result) => {
    const experiences = result.data && result.data.preFetchExperiences;

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
        combinedExperienceData as unknown as ExperienceCompleteFragment,
      );

      writeCachedEntriesDetailView(
        experienceId,
        toGetEntriesSuccessQuery(entryConnection),
      );
    });
  });
}

export type HandlePreFetchExperiencesFn = {
  handlePreFetchExperiences: typeof handlePreFetchExperiences
}
