/* istanbul ignore file */

import { getExperienceAndEntriesDetailView } from "@eb/shared/src/apollo/experience.gql.types";
import { componentTimeoutsMs } from "@eb/shared/src/utils/timers";
import { deleteExperiences } from "../../utils/delete-experiences.gql";
import { updateExperiencesMutation } from "../../utils/update-experiences.gql";
import { DetailExperience } from "./detail-experience.component";
import { CallerProps } from "./detailed-experience-utils";

export default (props: CallerProps) => {
  return (
    <DetailExperience
      {...props}
      deleteExperiences={deleteExperiences}
      componentTimeoutsMs={componentTimeoutsMs}
      updateExperiencesMutation={updateExperiencesMutation}
      getExperienceAndEntriesDetailViewInject={
        getExperienceAndEntriesDetailView
      }
    />
  );
};
