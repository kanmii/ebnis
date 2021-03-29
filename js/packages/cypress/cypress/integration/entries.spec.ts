import { noEntryTriggerId } from "@eb/cra/src/components/entries/entries.dom";
import {
  domPrefix as upsertEntryId,
  submitBtnDomId as upsertEntrySubmitBtnDomId,
} from "@eb/cra/src/components/UpsertEntry/upsert-entry.dom";
import {
  createOfflineEntryMutation,
  CreateOfflineEntryMutationReturnVal,
} from "@eb/cra/src/components/UpsertEntry/upsert-entry.resolvers";
import { updateCacheQueriesWithCreatedExperience } from "@eb/cra/src/components/UpsertExperience/upsert-experience.resolvers";
import { makeDetailedExperienceRoute } from "@eb/cra/src/utils/urls";
import { EntryFragment } from "@eb/shared/src/graphql/apollo-types/EntryFragment";
import { ExperienceCompleteFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceCompleteFragment";
import { DataTypes } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { UpdateExperiencesOnline } from "@eb/shared/src/graphql/apollo-types/UpdateExperiencesOnline";
import {
  mockOnlineDataDefinitionInteger1Id,
  mockOnlineExperience1,
} from "@eb/shared/src/__tests__/mock-data";
import {
  createExperiencesMswGql,
  updateExperiencesMswGql,
} from "@eb/shared/src/__tests__/msw-handlers";
import { createOnlineExperience } from "../support/create-experiences";
import { useCypressMsw } from "../support/cypress-msw";

describe("Detailed experience page", () => {
  beforeEach(() => {
    cy.checkoutSession();
    cy.registerUser();
  });

  // :TODO: handle experience not found with a 404 page

  it("create online entry succeeds", () => {
    const { title, description } = mockOnlineExperience1;

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
    });

    cy.wrap(p).then((unwrapped) => {
      const { id: experienceId, dataDefinitions } =
        unwrapped as ExperienceCompleteFragment;

      const def0 = dataDefinitions[0];

      // When we visit experience detail page
      const url = makeDetailedExperienceRoute(experienceId);
      cy.visit(url);
      cy.title().should("contain", title);
      cy.setConnectionStatus(true);

      cy.get("#" + noEntryTriggerId)
        .should("exist")
        .click();

      cy.get("#" + upsertEntryId)
        .should("exist")
        .within(() => {
          cy.get("#" + def0.id).type("5");
        });

      cy.get("#" + upsertEntrySubmitBtnDomId).click();
    });
  });
});

describe("Detailed experience page MSW", () => {
  beforeEach(() => {
    cy.checkoutSession({ useMsw: true });
    cy.loginMockUser();
  });

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
        const { experience, entry } =
          result as CreateOfflineEntryMutationReturnVal;
        updateCacheQueriesWithCreatedExperience(experience, [entry]);

        return result;
      });
    });

    cy.wrap(p).then((unwrapped) => {
      const { entry } = unwrapped as CreateOfflineEntryMutationReturnVal;

      useCypressMsw(
        updateExperiencesMswGql(updateExperiencesMswGql1(entry, experienceId)),
      );

      // When we visit experience detail page
      const url = makeDetailedExperienceRoute(experienceId);
      cy.visit(url);
      cy.setConnectionStatus(true);
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
