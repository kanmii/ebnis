import { ExperienceCompleteFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceCompleteFragment";
import { DataTypes } from "@eb/cm/src/graphql/apollo-types/globalTypes";
import { mockOnlineExperience1 } from "@eb/cm/src/__tests__/mock-data";
import { makeDetailedExperienceRoute } from "@eb/cra/src/utils/urls";
import { createOnlineExperience } from "../support/create-experiences";

context("Detailed experience page", () => {
  beforeEach(() => {
    cy.checkoutSession();
    cy.registerUser();
  });

  // :TODO: handle experience not found with a 404 page

  it("create entry succeeds", () => {
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
      const { id: experienceId } = unwrapped as ExperienceCompleteFragment;

      // When we visit experience detail page
      const url = makeDetailedExperienceRoute(experienceId);
      cy.visit(url);
      cy.setConnectionStatus(true);
    });
  });
});
