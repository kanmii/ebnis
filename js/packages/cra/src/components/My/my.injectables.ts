import { preFetchExperiences } from "../../utils/experience.gql.types";
import {
  writeCachedEntriesDetailView,
  writeGetExperienceDetailViewQueryToCache,
} from "../../apollo/get-detailed-experience-query";
import { toGetEntriesSuccessQuery } from "@eb/cm/src/graphql/utils.gql";
import { EntryConnectionFragment } from "@eb/cm/src/graphql/apollo-types/EntryConnectionFragment";
import { ExperienceListViewFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceListViewFragment";
import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";

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
        (combinedExperienceData as unknown) as ExperienceCompleteFragment,
      );

      writeCachedEntriesDetailView(
        experienceId,
        toGetEntriesSuccessQuery(entryConnection),
      );
    });

    const { cache } = window.____ebnis;
    const dataProxy = cache as any;
    const data = dataProxy.data.data.ROOT_QUERY;

    for (const key of Object.keys(data)) {
      if (key.startsWith("preFetchExperiences({")) {
        delete data[key];
        break;
      }
    }
  });
}
