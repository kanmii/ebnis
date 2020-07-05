import { LOGIN_URL } from "../../src/utils/urls";
import { LOGIN_PAGE_TITLE } from "../../src/components/Login/login.dom";
import {
  passwordInputId,
  emailInputId,
  submitId,
  notificationId,
} from "../../src/components/Login/login.dom";
import { MY_TITLE } from "../../src/components/My/my.dom";
import { CREATE_USER_ATTRS as userAttrs } from "../support/create-user-attrs";

context("Login user", () => {
  beforeEach(() => {
    cy.checkoutSession();
    cy.createUser(userAttrs);
  });

  it("succeeds", () => {
    cy.visit(LOGIN_URL);
    cy.title().should("contain", LOGIN_PAGE_TITLE);
    cy.get("#" + emailInputId).type(userAttrs.email);
    cy.get("#" + passwordInputId).type(userAttrs.password);
    cy.get("#" + submitId).click();
    cy.title().should("contain", MY_TITLE);
  });

  it("fails: wrong password", () => {
    cy.visit(LOGIN_URL);
    cy.get("#" + emailInputId).type(userAttrs.email);
    cy.get("#" + passwordInputId).type(userAttrs.password + "1");
    cy.get("#" + notificationId).should("not.exist");
    cy.get("#" + submitId).click();
    cy.get("#" + notificationId).should("exist");
  });
});
