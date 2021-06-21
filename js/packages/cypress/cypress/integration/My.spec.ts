import {
  activateInsertExperienceDomId,
  dropdownTriggerSelector,
  experienceContainerSelector,
  MY_TITLE,
  updateExperienceMenuItemSelector,
  updateExperienceSuccessNotificationSelector,
} from "@eb/cra/src/components/My/my.dom";
import {
  addDefinitionSelector,
  definitionContainerDomSelector,
  definitionNameFormControlSelector,
  definitionTypeFormControlSelector,
  descriptionInputDomId,
  domPrefix as upsertExperienceDomId,
  notificationCloseId,
  submitDomId,
  titleInputDomId,
} from "@eb/cra/src/components/UpsertExperience/upsert-experience.dom";
import { createOfflineExperience } from "@eb/cra/src/components/UpsertExperience/upsert-experience.resolvers";
import { MY_URL } from "@eb/cra/src/utils/urls";
import { ExperienceCompleteFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceCompleteFragment";
import { DataTypes } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { createOnlineExperience } from "../support/create-experiences";

context("My page", () => {
  beforeEach(() => {
    cy.checkoutSession();
    cy.registerUser();
  });

  describe("create experience", () => {
    const title1 = "tt";
    const titleAppend = "1";
    const title2 = title1 + titleAppend;

    it("online fails/succeeds", () => {
      // Given an online experience exists in the system
      const p = createOnlineExperience({
        title: title1,
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
        cy.get("#" + upsertExperienceDomId).within(() => {
          // When we fill title field with existing experience title
          cy.get("#" + titleInputDomId).type(title1);

          // And we fill description field
          cy.get("#" + descriptionInputDomId).type("dd");

          // And we fill data definition name
          cy.get("." + definitionNameFormControlSelector).type("n0");

          // And we complete data type
          cy.get("." + definitionTypeFormControlSelector).select(
            DataTypes.SINGLE_LINE_TEXT,
          );

          // When form is submitted
          cy.get("#" + submitDomId)
            .as("submitEl")
            .click();

          // Notification that experience creation failed should be visible
          cy.get("#" + notificationCloseId)
            .should("exist")
            // When the notification is closed
            .click();

          // Notification should not be visible
          cy.get("#" + notificationCloseId).should("not.exist");

          ////////////////////////// new experience ///////////////////////

          // When form is filled with a title that did not exist in the system
          cy.get("#" + titleInputDomId).type(titleAppend);

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
          cy.get("@submitEl").click();
        });

        // then we should be redirected to newly created experience page
        cy.title().should("contain", title2);
      });
    });

    it("offline fails/succeeds", () => {
      // Given there is an offline experience in the system
      const p = createOfflineExperience({
        input: [
          {
            title: title1,
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
        cy.get("#" + upsertExperienceDomId).then(() => {
          // When we fill title field with existing experience title
          cy.get("#" + titleInputDomId).type(title1);

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
          cy.get("#" + submitDomId)
            .as("submitEl")
            .click();

          // Notification that experience creation failed should be visible
          cy.get("#" + notificationCloseId).should("exist");

          ////////////////////////// new experience ///////////////////////

          // When form is filled with a title that did not exist in the system
          cy.get("#" + titleInputDomId).type(titleAppend);

          // And form is submitted
          cy.get("@submitEl").click();
        });

        // then we should be redirected to newly created experience page
        cy.title().should("contain", title2);
      });
    });
  });

  describe("update experience", () => {
    const dataDefinitions = [
      {
        name: "date",
        type: DataTypes.DATE,
      },
      {
        name: "time",
        type: DataTypes.DATETIME,
      },
      {
        name: "dec",
        type: DataTypes.DECIMAL,
      },
      {
        name: "int",
        type: DataTypes.INTEGER,
      },
      {
        name: "single",
        type: DataTypes.SINGLE_LINE_TEXT,
      },
      {
        name: "multi",
        type: DataTypes.MULTI_LINE_TEXT,
      },
    ];

    it("updates online", () => {
      // Given there are two online experiences in the system

      const promises = Promise.all([
        createOnlineExperience({
          title: "t1",
          dataDefinitions,
        }),
        createOnlineExperience({
          title: "t2",
          description: "d2",
          dataDefinitions,
        }),
      ]);

      cy.wrap(promises).then((experiences) => {
        const [experience1, experience2] = experiences as [
          ExperienceCompleteFragment,
          ExperienceCompleteFragment,
        ];

        const { id: experience1Id } = experience1;
        const { id: experience2Id } = experience2;
        // When we visit experiences list page
        cy.visit(MY_URL);

        cy.get("." + experienceContainerSelector)
          .eq(1)
          .as("experience1")
          .should("have.id", experience1Id);

        cy.get("@experience1").within(() => {
          // And we click on menu button of second experience (title1)
          cy.get("." + dropdownTriggerSelector).click();

          // And we click on edit button of experience
          cy.get("." + updateExperienceMenuItemSelector).click();
        });

        // Then we should see UI to Update experience
        cy.get("#" + upsertExperienceDomId).within(() => {
          cy.get("#" + titleInputDomId)
            // And title field should contain current title
            .should("have.value", "t1")
            // We update title field
            .type(".");

          cy.get("#" + descriptionInputDomId)
            // Description field should be empty
            .should("have.value", "")
            // We update the description field
            .type("d1");

          cy.get("." + definitionContainerDomSelector).within(() => {
            cy.get("." + definitionTypeFormControlSelector)
              .as("typeEls")
              .first()
              .as("dateEl")
              .select(DataTypes.INTEGER);
          });

          // When form is submitted
          cy.get("#" + submitDomId)
            .as("submitEl")
            .click();

          // Notification that experience update failed should be visible
          cy.get("#" + notificationCloseId)
            .should("exist")
            .click();

          // Form is filled correctly
          cy.get("@dateEl").select(DataTypes.DATETIME);
          cy.get("@typeEls").eq(1).select(DataTypes.DATE);
          cy.get("@typeEls").eq(2).select(DataTypes.INTEGER);
          cy.get("@typeEls").eq(3).select(DataTypes.DECIMAL);
          cy.get("@typeEls").eq(4).select(DataTypes.MULTI_LINE_TEXT);
          cy.get("@typeEls").eq(5).select(DataTypes.SINGLE_LINE_TEXT);

          // When form is submitted
          cy.get("@submitEl").click();
        });

        cy.get("@experience1").within(() => {
          // Notification that experience update succeeded should be visible
          cy.get("." + updateExperienceSuccessNotificationSelector)
            .should("exist")
            .click();
        });

        // And updated experience should go to the top
        cy.get("." + experienceContainerSelector)
          .as("experiences")
          .eq(0)
          .should("have.id", experience1Id);

        cy.get("@experiences").eq(1).should("have.id", experience2Id);
      });
    });

    it("updates offline", () => {
      // Given there are two online experiences in the system

      const promises = Promise.all([
        createOnlineExperience({
          title: "t1",
          dataDefinitions,
        }),
        createOnlineExperience({
          title: "t2",
          description: "d2",
          dataDefinitions,
        }),
      ]);

      cy.wrap(promises).then((experiences) => {
        const [experience1, experience2] = experiences as [
          ExperienceCompleteFragment,
          ExperienceCompleteFragment,
        ];

        const { id: experience1Id } = experience1;
        const { id: experience2Id } = experience2;
        // When we visit experiences list page
        cy.visit(MY_URL);

        cy.get("." + experienceContainerSelector)
          .eq(1)
          .as("experience1")
          .should("have.id", experience1Id);

        // And connection to our backend is severed
        cy.setConnectionStatus(false);

        cy.get("@experience1").within(() => {
          // And we click on menu button of second experience (title1)
          cy.get("." + dropdownTriggerSelector).click();

          // And we click on edit button of experience
          cy.get("." + updateExperienceMenuItemSelector).click();
        });

        // Then we should see UI to Update experience
        cy.get("#" + upsertExperienceDomId).within(() => {
          // We update title field
          cy.get("#" + titleInputDomId).type(".");

          // We update the description field
          cy.get("#" + descriptionInputDomId).type("d1");

          cy.get("." + definitionContainerDomSelector).within(() => {
            cy.get("." + definitionTypeFormControlSelector)
              .as("typeEls")
              .first()
              .as("dateEl")
              .select(DataTypes.INTEGER);
          });

          // When form is submitted
          cy.get("#" + submitDomId)
            .as("submitEl")
            .click();

          // Notification that experience update failed should be visible
          cy.get("#" + notificationCloseId).click();

          // Form is filled correctly
          cy.get("@dateEl").select(DataTypes.DATETIME);
          cy.get("@typeEls").eq(1).select(DataTypes.DATE);
          cy.get("@typeEls").eq(2).select(DataTypes.INTEGER);
          cy.get("@typeEls").eq(3).select(DataTypes.DECIMAL);
          cy.get("@typeEls").eq(4).select(DataTypes.MULTI_LINE_TEXT);
          cy.get("@typeEls").eq(5).select(DataTypes.SINGLE_LINE_TEXT);

          // When form is submitted
          cy.get("@submitEl").click();
        });

        cy.get("@experience1").within(() => {
          // Notification that experience update succeeded should be visible
          cy.get(
            "." + updateExperienceSuccessNotificationSelector,
          ).click();
        });

        // And updated experience should go to the top
        cy.get("." + experienceContainerSelector)
          .as("experiences")
          .eq(0)
          .should("have.id", experience1Id);

        cy.get("@experiences").eq(1).should("have.id", experience2Id);

        cy.setConnectionStatus(true);
      });
    });
  });
});
