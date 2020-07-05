import { RegisterUserInput } from "../../src/graphql/apollo-types/globalTypes";

export interface CreateUserAttrs {
  email: string;
  name: string;
  password: string;
  password_confirmation: string;
  source: string;
}

export const CREATE_USER_ATTRS: CreateUserAttrs = {
  email: "a@b.com",
  name: "a@b.com",
  password: "a@b.com",
  password_confirmation: "a@b.com",
  source: "password",
};

export const REGISTER_USER_ATTRS: RegisterUserInput = {
  email: "a@b.com",
  name: "a@b.com",
  password: "a@b.com",
  passwordConfirmation: "a@b.com",
  source: "password",
};
