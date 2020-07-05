/// <reference types="cypress" />
import { MY_URL } from "../../src/utils/urls";
import {
  MY_TITLE,
  activateNewDomId,
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
} from "../../src/components/NewExperience/new-experience.dom";
import { DataTypes } from "../../src/graphql/apollo-types/globalTypes";
import {
  createOnlineExperience,
  createOfflineExperience,
} from "../support/create-experiences";

context("My page", () => {
  beforeEach(() => {
    cy.checkoutSession();
    cy.registerUser();
  });

  const existingExperienceTitle = "tt";
  const newExperienceTitleAppend = "1";
  const newExperienceTitle = existingExperienceTitle + newExperienceTitleAppend;

  describe("online experience", () => {
    it("create fails/succeeds", () => {
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
        cy.visit(MY_URL);
        cy.title().should("contain", MY_TITLE);
        cy.get("#" + activateNewDomId).click();
        cy.get("#" + newExperienceDomId).then(() => {
          cy.get("#" + titleInputDomId).type(existingExperienceTitle);
          cy.get("#" + descriptionInputDomId).type("dd"); // existing title

          cy.get("." + definitionNameFormControlSelector).type("n0");

          cy.get("." + definitionTypeFormControlSelector).select(
            DataTypes.SINGLE_LINE_TEXT,
          );

          cy.get("#" + notificationCloseId).should("not.exist");
          cy.get("#" + submitDomId).click();
          cy.get("#" + notificationCloseId)
            .should("exist")
            .click();
          cy.get("#" + notificationCloseId).should("not.exist");

          ////////////////////////// new experience ///////////////////////

          cy.get("#" + titleInputDomId).type(newExperienceTitleAppend);

          // add dataDefinition field
          cy.get("." + addDefinitionSelector).click();

          cy.get("." + definitionNameFormControlSelector)
            .eq(1)
            .type("n1");

          cy.get("." + definitionTypeFormControlSelector)
            .eq(1)
            .select(DataTypes.SINGLE_LINE_TEXT);

          cy.get("#" + submitDomId).click();
        });

        cy.title().should("contain", newExperienceTitle);
      });
    });
  });

  describe("offline experience", () => {
    it("create fails/succeeds", () => {
      const p = createOfflineExperience({
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
        cy.visit(MY_URL);
        cy.title().should("contain", MY_TITLE);
        cy.get("#" + activateNewDomId).click();
        cy.setConnectionStatus(false);

        cy.get("#" + newExperienceDomId).then(() => {
          cy.get("#" + titleInputDomId).type(existingExperienceTitle);
          cy.get("#" + descriptionInputDomId).type("dd");

          cy.get("." + definitionNameFormControlSelector).type("n0");

          cy.get("." + definitionTypeFormControlSelector).select(
            DataTypes.SINGLE_LINE_TEXT,
          );

          cy.get("#" + notificationCloseId).should("not.exist");
          cy.get("#" + submitDomId).click();
          cy.get("#" + notificationCloseId).should("exist");

          ////////////////////////// new experience ///////////////////////

          cy.get("#" + titleInputDomId).type(newExperienceTitleAppend);
          cy.get("#" + submitDomId).click();
        });

        // cy.title().should("contain", newExperienceTitle);
      });
    });
  });
});
