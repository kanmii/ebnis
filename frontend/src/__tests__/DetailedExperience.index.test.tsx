/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup } from "@testing-library/react";
import { DetailExperienceIndex } from "../components/DetailExperience/detail-experience.index";
import {
  useGetExperienceDetail,
  useDeleteExperiencesMutation,
} from "../components/DetailExperience/detail-experience.injectables";

jest.mock("../components/Header/header.component", () => {
  return () => null;
});

jest.mock("../components/DetailExperience/detail-experience.injectables");
const mockUseGetExperienceDetail = useGetExperienceDetail as jest.Mock;
const mockUseDeleteExperiencesMutation = useDeleteExperiencesMutation as jest.Mock;

const mockLoadingDomId = "aa";
jest.mock("../components/Loading/loading.component", () => {
  return () => <div id={mockLoadingDomId} />;
});

const mockDetailedExperienceDomId = "bb";
jest.mock("../components/DetailExperience/detail-experience.component", () => {
  return {
    DetailExperience: () => <div id={mockDetailedExperienceDomId} />,
  };
});

beforeEach(() => {
  mockUseDeleteExperiencesMutation.mockReturnValue([]);
});

afterEach(() => {
  cleanup();
});

it("renders error", () => {
  mockUseGetExperienceDetail.mockReturnValue({ error: "aa" });
  const { ui } = makeComp();
  render(ui);
  expect(document.getElementById(mockLoadingDomId)).toBeNull();
  expect(document.getElementById(mockDetailedExperienceDomId)).toBeNull();
});

it("renders loading", () => {
  mockUseGetExperienceDetail.mockReturnValue({ loading: true });
  const { ui } = makeComp();
  render(ui);
  expect(document.getElementById(mockLoadingDomId)).not.toBeNull();
  expect(document.getElementById(mockDetailedExperienceDomId)).toBeNull();
});

it("renders data", () => {
  mockUseGetExperienceDetail.mockReturnValue({ data: {} });
  const { ui } = makeComp();
  render(ui);
  expect(document.getElementById(mockDetailedExperienceDomId)).not.toBeNull();
  expect(document.getElementById(mockLoadingDomId)).toBeNull();
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const DetailExperienceIndexP = DetailExperienceIndex as ComponentType<
  Partial<{}>
>;

function makeComp({
  props = {
    match: {
      params: {
        experienceId: "1",
      },
    },
  },
}: { props?: Partial<{}> } = {}) {
  return {
    ui: <DetailExperienceIndexP {...props} />,
  };
}
