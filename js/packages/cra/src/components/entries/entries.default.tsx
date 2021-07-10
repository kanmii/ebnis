import { getEntriesDetailView } from "@eb/shared/src/apollo/entries-connection.gql";
import { componentTimeoutsMs } from "@eb/shared/src/utils/timers";
import { updateExperiencesMutation } from "../../utils/update-experiences.gql";
import { Entries as EntriesComponent } from "./entries.component";
import { CallerProps } from "./entries.utils";

const Entries = (props: CallerProps) => {
  return (
    <EntriesComponent
      {...props}
      componentTimeoutsMs={componentTimeoutsMs}
      updateExperiencesMutation={updateExperiencesMutation}
      getEntriesDetailView={getEntriesDetailView}
    />
  );
};

export default Entries;

export type EntriesInjectType = {
  EntriesInject: typeof Entries;
};
