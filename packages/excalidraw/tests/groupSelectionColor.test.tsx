import React from "react";
import { vi } from "vitest";

import { COLOR_PALETTE, THEME, applyDarkModeFilter } from "@excalidraw/common";

import { Excalidraw } from "../index";
import * as RendererHelpers from "../renderer/helpers";

import { API } from "./helpers/api";
import { act, render, unmountComponent } from "./test-utils";

unmountComponent();

const { h } = window;

// group selection borders are the only ones dashed with 8px segments
// (see `renderSelectionBorder`)
const GROUP_BORDER_DASH = 8;

// the context is mutated between calls, so record its state at call time
let strokes: { strokeStyle: string; lineDash: number[] }[] = [];
const strokeRectWithRotation = RendererHelpers.strokeRectWithRotation_simple;
vi.spyOn(RendererHelpers, "strokeRectWithRotation_simple").mockImplementation(
  (context, ...args) => {
    strokes.push({
      strokeStyle: String(context.strokeStyle),
      lineDash: context.getLineDash(),
    });
    return strokeRectWithRotation(context, ...args);
  },
);

const getGroupBorderColors = () =>
  strokes
    .filter(({ lineDash }) => lineDash[0] === GROUP_BORDER_DASH)
    .map(({ strokeStyle }) => strokeStyle);

const selectGroup = async ({
  viewBackgroundColor,
  theme = THEME.LIGHT,
}: {
  viewBackgroundColor: string;
  theme?: typeof THEME.LIGHT | typeof THEME.DARK;
}) => {
  await render(<Excalidraw />);

  const rect1 = API.createElement({
    type: "rectangle",
    x: 0,
    y: 0,
    groupIds: ["g1"],
  });
  const rect2 = API.createElement({
    type: "rectangle",
    x: 200,
    y: 0,
    groupIds: ["g1"],
  });
  API.setElements([rect1, rect2]);

  strokes = [];
  act(() => {
    h.setState({
      viewBackgroundColor,
      theme,
      selectedElementIds: { [rect1.id]: true, [rect2.id]: true },
      selectedGroupIds: { g1: true },
    });
  });
};

describe("group selection border color", () => {
  beforeEach(() => {
    localStorage.clear();
    strokes = [];
  });

  it("is white on a dark canvas background in light theme", async () => {
    await selectGroup({ viewBackgroundColor: COLOR_PALETTE.black });

    const colors = getGroupBorderColors();
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((color) => color === "#ffffff")).toBe(true);
  });

  it("stays black on a light canvas background in light theme", async () => {
    await selectGroup({ viewBackgroundColor: COLOR_PALETTE.white });

    const colors = getGroupBorderColors();
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((color) => color === "#000000")).toBe(true);
  });

  it("follows a canvas background change while the group stays selected", async () => {
    await selectGroup({ viewBackgroundColor: COLOR_PALETTE.white });

    strokes = [];
    act(() => {
      h.setState({ viewBackgroundColor: COLOR_PALETTE.black });
    });

    const colors = getGroupBorderColors();
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((color) => color === "#ffffff")).toBe(true);
  });

  it("is unchanged on the default background in dark theme", async () => {
    await selectGroup({
      viewBackgroundColor: COLOR_PALETTE.white,
      theme: THEME.DARK,
    });

    const colors = getGroupBorderColors();
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((color) => color === applyDarkModeFilter("#000"))).toBe(
      true,
    );
  });
});
