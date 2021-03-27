import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { DataTypes } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { createOfflineExperience } from "@eb/cra/src/components/UpsertExperience/upsert-experience.resolvers";
import { MY_URL } from "@eb/cra/src/utils/urls";

context("Sync", () => {
  beforeEach(() => {
    cy.checkoutSession();
    cy.registerUser();
  });

  describe("My page", () => {
    it("sync complete offline experience succeeds", () => {
      // Given there is an offline experience in the system
      const p = createOfflineExperience({
        input: [
          {
            title: "t1",
            description: "dd",
            dataDefinitions: [
              {
                name: "nn",
                type: DataTypes.INTEGER,
              },
            ],
          },
        ],
      });

      cy.wrap(p).then((p) => {
        const { id } = p as ExperienceCompleteFragment;

        // When we visit experiences list page
        cy.visit(MY_URL);

        // offline experience should exist
        cy.get("#" + id).should("exist");

        // when data is synced
        cy.setConnectionStatus(true);

        // offline experience should not exist
        cy.get("#" + id).should("not.exist");

        // :TODO: test that online experience exists
        // hint: set data-client-id in `MyComponent`, but only after we start
        // using ULID in the client
      });
    });
  });
});
