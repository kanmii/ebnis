import { preFetchExperiences } from "../../utils/experience.gql.types";
import {
  writeGetEntriesQuery,
  writeGetExperienceQueryToCache,
} from "../../apollo/get-detailed-experience-query";
import { toGetEntriesSuccessQuery } from "../../graphql/utils.gql";
import { EntryConnectionFragment } from "../../graphql/apollo-types/EntryConnectionFragment";
import { ExperienceMiniFragment } from "../../graphql/apollo-types/ExperienceMiniFragment";

// istanbul ignore next:
export function handlePreFetchExperiences(
  erfahrungenIds: string[],
  idToExperienceMap: {
    [experienceId: string]: ExperienceMiniFragment;
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

      writeGetExperienceQueryToCache(combinedExperienceData);

      writeGetEntriesQuery(
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
