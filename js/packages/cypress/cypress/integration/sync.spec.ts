import { MY_URL } from "@eb/cra/src/utils/urls";
import { createOfflineExperience } from "@eb/shared/src/apollo/upsert-experience.resolvers";
import { ExperienceDCFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDCFragment";
import { DataTypes } from "@eb/shared/src/graphql/apollo-types/globalTypes";

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
      }) as Promise<ExperienceDCFragment>;

      cy.wrap<Promise<ExperienceDCFragment>, ExperienceDCFragment>(p).then(
        (p) => {
          const { id } = p;

          cy.setConnectionStatus(false);

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
        },
      );
    });
  });
});
