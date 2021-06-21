import { GetExperienceAndEntriesDetailView } from "../graphql/apollo-types/GetExperienceAndEntriesDetailView";
import { EntriesCacheUnion } from "./entries-connection.gql";

export type CacheExperienceAndEntries = {
  getEntries: EntriesCacheUnion;
} & Pick<GetExperienceAndEntriesDetailView, "getExperience">;
