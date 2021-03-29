import { EntryFragment } from "@eb/cm/src/graphql/apollo-types/EntryFragment";
import { DataTypes } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { UpdateExperiencesOnline } from "@eb/cm/src/graphql/apollo-types/UpdateExperiencesOnline";
import {
  mockOnlineDataDefinitionInteger1Id,
  mockOnlineExperience1,
} from "@eb/cm/src/__tests__/mock-data";
import {
  createExperiencesMswGql,
  updateExperiencesMswGql,
} from "@eb/cm/src/__tests__/msw-handlers";
import {
  createOfflineEntryMutation,
  CreateOfflineEntryMutationReturnVal,
} from "@eb/cra/src/components/UpsertEntry/upsert-entry.resolvers";
import { updateCacheQueriesWithCreatedExperience } from "@eb/cra/src/components/UpsertExperience/upsert-experience.resolvers";
import { makeDetailedExperienceRoute } from "@eb/cra/src/utils/urls";
import { createOnlineExperience } from "../support/create-experiences";
import { useCypressMsw } from "../support/cypress-msw";

context("Entries MSW", () => {
  beforeEach(() => {
    cy.checkoutMockSession();
    cy.loginMockUser();
  });

  describe("Detailed experience page", () => {
    it("sync complete offline experience succeeds", () => {
      const { id: experienceId, title, description } = mockOnlineExperience1;

      useCypressMsw(
        createExperiencesMswGql({
          createExperiences: [
            {
              __typename: "ExperienceSuccess",
              entries: null,
              experience: {
                ...mockOnlineExperience1,
              },
            },
          ],
        }),
      );

      // Given an online experience exists in the system
      const p = createOnlineExperience({
        title,
        description,
        dataDefinitions: [
          {
            name: "nn",
            type: DataTypes.INTEGER,
          },
        ],
      }).then(() => {
        return createOfflineEntryMutation({
          experienceId,
          dataObjects: [
            {
              definitionId: mockOnlineDataDefinitionInteger1Id,
              data: `{"integer":1}`,
            },
          ],
        }).then((result) => {
          const {
            experience,
            entry,
          } = result as CreateOfflineEntryMutationReturnVal;
          updateCacheQueriesWithCreatedExperience(experience, [entry]);

          return result;
        });
      });

      cy.wrap(p).then((unwrapped) => {
        const { entry } = unwrapped as CreateOfflineEntryMutationReturnVal;

        useCypressMsw(
          updateExperiencesMswGql(
            updateExperiencesMswGql1(entry, experienceId),
          ),
        );

        // When we visit experience detail page
        const url = makeDetailedExperienceRoute(experienceId);
        cy.visit(url);
        cy.setConnectionStatus(true);
      });
    });
  });
});

function updateExperiencesMswGql1(entry: EntryFragment, experienceId: string) {
  const data: UpdateExperiencesOnline = {
    updateExperiences: {
      __typename: "UpdateExperiencesSomeSuccess",
      experiences: [
        {
          __typename: "UpdateExperienceSomeSuccess",
          experience: {
            __typename: "UpdateExperience",
            experienceId,
            ownFields: null,
            updatedDefinitions: null,
            updatedAt: "",
          },
          entries: {
            __typename: "UpdateExperienceEntriesKomponenten",
            updatedEntries: null,
            deletedEntries: null,
            newEntries: [
              {
                __typename: "CreateEntryErrors",
                errors: {
                  __typename: "CreateEntryError",
                  error: "some error",
                  clientId: null,
                  experienceId: null,
                  dataObjects: null,
                  meta: {
                    __typename: "CreateEntryErrorMeta",
                    experienceId,
                    index: 0,
                    clientId: entry.clientId,
                  },
                },
              },
            ],
          },
          comments: null,
        },
      ],
    },
  };

  return data;
}
