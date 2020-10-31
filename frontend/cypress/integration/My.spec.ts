import {
  MY_TITLE,
  activateInsertExperienceDomId,
} from "../../src/components/My/my.dom";
import {
  domPrefix as newExperienceDomId,
  submitDomId,
  titleInputDomId,
  descriptionInputDomId,
  definitionNameFormControlSelector,
  definitionTypeFormControlSelector,
  notificationCloseId,
  addDefinitionSelector,
} from "../../src/components/UpsertExperience/upsert-experience.dom";
import { DataTypes } from "../../src/graphql/apollo-types/globalTypes";
import { createOnlineExperience } from "../support/create-experiences";
import { createOfflineExperience } from "../../src/components/UpsertExperience/upsert-experience.resolvers";
import { CYPRESS_APOLLO_KEY } from "../../src/apollo/setup";
import { MY_URL } from "../../src/utils/urls";

context("My page", () => {
  beforeEach(() => {
    cy.checkoutSession();
    cy.registerUser();
  });

  const existingExperienceTitle = "tt";
  const newExperienceTitleAppend = "1";
  const newExperienceTitle = existingExperienceTitle + newExperienceTitleAppend;

  describe("online experience", () => {
    it("create fails/succeeds/update", () => {
      // Given an online experience exists in the system
      const p = createOnlineExperience({
        title: existingExperienceTitle,
        description: "dd",
        dataDefinitions: [
          {
            name: "nn",
            type: DataTypes.INTEGER,
          },
        ],
      });

      cy.wrap(p).then(() => {
        // When we visit experiences list page
        cy.visit(MY_URL);

        // We should see page title
        cy.title().should("contain", MY_TITLE);

        // When link to create new experience is clicked
        cy.get("#" + activateInsertExperienceDomId).click();

        // We should see UI to create new experience
        cy.get("#" + newExperienceDomId).then(() => {
          // When we fill title field with existing experience title
          cy.get("#" + titleInputDomId).type(existingExperienceTitle);

          // And we fill description field
          cy.get("#" + descriptionInputDomId).type("dd");

          // And we fill data definition name
          cy.get("." + definitionNameFormControlSelector).type("n0");

          // And we complete data type
          cy.get("." + definitionTypeFormControlSelector).select(
            DataTypes.SINGLE_LINE_TEXT,
          );

          // Notification that experience created successfully/failed should not be visible
          cy.get("#" + notificationCloseId).should("not.exist");

          // When form is submitted
          cy.get("#" + submitDomId).click();

          // Notification that experience creation failed should be visible
          cy.get("#" + notificationCloseId)
            .should("exist")
            // When the notification is closed
            .click();

          // Notification should not be visible
          cy.get("#" + notificationCloseId).should("not.exist");

          ////////////////////////// new experience ///////////////////////

          // When form is filled with a title that did not exist in the system
          cy.get("#" + titleInputDomId).type(newExperienceTitleAppend);

          // And additional data definition field is added
          cy.get("." + addDefinitionSelector).click();

          // And definition name field is completed
          cy.get("." + definitionNameFormControlSelector)
            .eq(1)
            .type("n1");

          // And definition type is completed
          cy.get("." + definitionTypeFormControlSelector)
            .eq(1)
            .select(DataTypes.SINGLE_LINE_TEXT);

          // And form is submitted
          cy.get("#" + submitDomId).click();
        });

        // then we should be redirected to newly created experience page
        cy.title().should("contain", newExperienceTitle);
      });
    });
  });

  describe("offline experience", () => {
    it("create fails/succeeds", () => {
      // Given there is an offline experience in the system
      const p = createOfflineExperience(
        {
          input: [
            {
              title: existingExperienceTitle,
              description: "dd",
              dataDefinitions: [
                {
                  name: "nn",
                  type: DataTypes.INTEGER,
                },
              ],
            },
          ],
        },
        Cypress.env(CYPRESS_APOLLO_KEY),
      );

      cy.wrap(p).then(() => {
        // When we visit experiences list page
        cy.visit(MY_URL);

        // We should see the page title
        cy.title().should("contain", MY_TITLE);

        // When we click link to create new experience
        cy.get("#" + activateInsertExperienceDomId).click();

        // And connection to our backend is severed
        cy.setConnectionStatus(false);

        // We should see UI to create new experience
        cy.get("#" + newExperienceDomId).then(() => {
          // When we fill title field with existing experience title
          cy.get("#" + titleInputDomId).type(existingExperienceTitle);

          // And we fill description field
          cy.get("#" + descriptionInputDomId).type("dd");

          // And we fill data definition name
          cy.get("." + definitionNameFormControlSelector).type("n0");

          // And we complete data type
          cy.get("." + definitionTypeFormControlSelector).select(
            DataTypes.SINGLE_LINE_TEXT,
          );

          // Notification that experience created successfully/failed should not be visible
          cy.get("#" + notificationCloseId).should("not.exist");

          // When form is submitted
          cy.get("#" + submitDomId).click();

          // Notification that experience creation failed should be visible
          cy.get("#" + notificationCloseId).should("exist");

          ////////////////////////// new experience ///////////////////////

          // When form is filled with a title that did not exist in the system
          cy.get("#" + titleInputDomId).type(newExperienceTitleAppend);

          // And form is submitted
          cy.get("#" + submitDomId).click();
        });

        // then we should be redirected to newly created experience page
        cy.title().should("contain", newExperienceTitle);
      });
    });
  });
});
