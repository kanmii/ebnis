import React from "react";
import Header from "../Header/header.component";
import { Match, IndexProps } from "./detail-experience.utils";
import { entriesPaginationVariables } from "../../graphql/entry.gql";
import Loading from "../Loading/loading.component";
import { DetailExperience } from "./detail-experience.component";
import { parseStringError } from "../../utils/common-errors";
import { ExperienceFragment } from "../../graphql/apollo-types/ExperienceFragment";
import {
  useDeleteExperiencesMutation,
  useGetExperienceDetail,
} from "./detail-experience.injectables";

export function DetailExperienceIndex(props: IndexProps) {
  const { experienceId } = (props.match as Match).params;
  const [deleteExperiences] = useDeleteExperiencesMutation();


  const { data, loading, error } = useGetExperienceDetail({
    id: experienceId,
    entriesPagination: entriesPaginationVariables.entriesPagination,
  });

  const experience = (data && data.getExperience) as ExperienceFragment;

  return (
    <>
      <Header />

      {error ? (
        parseStringError(error)
      ) : loading ? (
        <Loading />
      ) : (
        <DetailExperience
          {...props}
          experience={experience}
          deleteExperiences={deleteExperiences}
        />
      )}
    </>
  );
}

// istanbul ignore next:
export default DetailExperienceIndex;
