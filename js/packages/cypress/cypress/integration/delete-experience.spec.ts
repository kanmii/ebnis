import {
  deleteFailNotificationCloseId,
  deleteMenuItemId,
  deleteOkId,
  menuTriggerSelector,
} from "@eb/cra/src/components/DetailExperience/detail-experience.dom";
import { makeDetailedExperienceRoute } from "@eb/cra/src/utils/urls";
import { ExperienceCompleteFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceCompleteFragment";
import { DataTypes } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { mockOnlineExperience1 } from "@eb/shared/src/__tests__/mock-data";
import {
  createExperiencesMswGql,
  deleteExperiencesMswGql,
  getExperienceAndEntriesDetailViewGqlMsw,
} from "@eb/shared/src/__tests__/msw-handlers";
import { createOnlineExperience } from "../support/create-experiences";
import { useCypressMsw } from "../support/cypress-msw";

context("Delete experience MSW", () => {
  beforeEach(() => {
    cy.checkoutSession({ useMsw: true });
    cy.loginMockUser();
  });

  describe("My page", () => {
    it("sync complete offline experience succeeds", () => {
      const { id, title, description } = mockOnlineExperience1;

      useCypressMsw(
        getExperienceAndEntriesDetailViewGqlMsw({
          getEntries: null,
          getExperience: {
            ...mockOnlineExperience1,
          },
        }),

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
      });

      cy.wrap<Promise<ExperienceCompleteFragment>, ExperienceCompleteFragment>(
        p,
      ).then(() => {
        useCypressMsw(
          deleteExperiencesMswGql({
            deleteExperiences: {
              __typename: "DeleteExperiencesSomeSuccess",
              experiences: [
                {
                  __typename: "DeleteExperienceErrors",
                  errors: {
                    __typename: "DeleteExperienceError",
                    id,
                    error: "a",
                  },
                },
              ],
              clientSession: "a",
              clientToken: "b",
            },
          }),
        );

        // When we visit experiences list page
        const url = makeDetailedExperienceRoute(id);
        cy.visit(url);
        cy.setConnectionStatus(true);

        // when delete menu is clicked
        cy.get("." + menuTriggerSelector)
          .first()
          .click();
        cy.get("#" + deleteMenuItemId).click();

        // Notification should not be visible
        cy.get("#" + deleteFailNotificationCloseId).should("not.exist");

        // when deletion is confirmed
        cy.get("#" + deleteOkId).click();

        // Notification should be visible
        // when notification closed
        cy.get("#" + deleteFailNotificationCloseId)
          .should("exist")
          .click();

        // Notification should not be visible
        cy.get("#" + deleteFailNotificationCloseId).should("not.exist");
      });
    });
  });
});
