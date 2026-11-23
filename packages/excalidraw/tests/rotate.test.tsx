import React from "react";
import { expect } from "vitest";

import { SHIFT_LOCKING_ANGLE, arrayToMap, reseed } from "@excalidraw/common";
import {
  getCommonBounds,
  getTransformHandles,
  getTransformHandlesFromCoords,
  OMIT_SIDES_FOR_MULTIPLE_ELEMENTS,
} from "@excalidraw/element";

import type { Radians } from "@excalidraw/math";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { UI } from "./helpers/ui";

import { render, unmountComponent } from "./test-utils";

import type { KeyboardModifiers } from "./helpers/ui";

unmountComponent();

const { h } = window;

beforeEach(() => {
  localStorage.clear();
  reseed(7);
});

test("unselected bound arrow updates when rotating its target element", async () => {
  await render(<Excalidraw />);
  const rectangle = UI.createElement("rectangle", {
    width: 200,
    height: 100,
  });
  const arrow = UI.createElement("arrow", {
    x: -80,
    y: 50,
    width: 85,
    height: 0,
  });

  expect(arrow.endBinding?.elementId).toEqual(rectangle.id);

  UI.rotate(rectangle, [60, 36], { shift: true });

  expect(arrow.endBinding?.elementId).toEqual(rectangle.id);
  expect(arrow.x).toBeCloseTo(-80);
  expect(arrow.y).toBeCloseTo(50);
  expect(arrow.width).toBeCloseTo(132.491, 1);
  expect(arrow.height).toBeCloseTo(82.267, 1);
});

test("unselected bound arrows update when rotating their target elements", async () => {
  await render(<Excalidraw />);
  const ellipse = UI.createElement("ellipse", {
    x: 0,
    y: 80,
    width: 300,
    height: 120,
  });
  const ellipseArrow = UI.createElement("arrow", {
    x: -10,
    y: 80,
    width: 50,
    height: 60,
  });
  const text = UI.createElement("text", {
    position: 220,
  });
  await UI.editText(text, "test");
  const textArrow = UI.createElement("arrow", {
    x: 360,
    y: 300,
    width: -140,
    height: -60,
  });

  expect(ellipseArrow.endBinding?.elementId).toEqual(ellipse.id);
  expect(textArrow.endBinding?.elementId).toEqual(text.id);

  UI.rotate([ellipse, text], [-82, 23], { shift: true });

  expect(ellipseArrow.endBinding?.elementId).toEqual(ellipse.id);
  expect(ellipseArrow.x).toEqual(-10);
  expect(ellipseArrow.y).toEqual(80);
  expect(ellipseArrow.points[0]).toEqual([0, 0]);
  expect(ellipseArrow.points[1][0]).toBeCloseTo(66.317, 1);
  expect(ellipseArrow.points[1][1]).toBeCloseTo(144.38, 1);

  expect(textArrow.endBinding?.elementId).toEqual(text.id);
  expect(textArrow.x).toEqual(360);
  expect(textArrow.y).toEqual(300);
  expect(textArrow.points[0]).toEqual([0, 0]);
  expect(textArrow.points[1][0]).toBeCloseTo(-95.4635969899922, 0);
  expect(textArrow.points[1][1]).toBeCloseTo(-126.8785027399889, 0);
});

describe("rotation with and without the grid", () => {
  const GRID_SIZE = 20;

  // drags the rotation handle of `elements` to the scene point `target`
  const rotateTo = (
    elements: ExcalidrawElement[],
    [targetX, targetY]: [number, number],
    keyboardModifiers: KeyboardModifiers = {},
  ) => {
    const [x1, y1, x2, y2] = getCommonBounds(elements);
    const handle =
      elements.length === 1
        ? getTransformHandles(
            elements[0],
            h.state.zoom,
            arrayToMap(h.elements),
            "mouse",
            {},
          ).rotation
        : getTransformHandlesFromCoords(
            [x1, y1, x2, y2, (x1 + x2) / 2, (y1 + y2) / 2],
            0 as Radians,
            h.state.zoom,
            "mouse",
            OMIT_SIDES_FOR_MULTIPLE_ELEMENTS,
          ).rotation;
    if (!handle) {
      throw new Error("no rotation handle");
    }
    const handleX = handle[0] + handle[2] / 2;
    const handleY = handle[1] + handle[3] / 2;
    UI.rotate(
      elements,
      [targetX - handleX, targetY - handleY],
      keyboardModifiers,
    );
  };

  const setup = async (gridModeEnabled: boolean) => {
    await render(<Excalidraw />);
    API.setAppState({ gridModeEnabled, gridSize: GRID_SIZE });
    // its center (50, 30) is not on a grid point
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 60,
    });
    API.setElements([rectangle]);
    return rectangle;
  };

  it("stops exactly on 90°, 180°, 270° and 0° with the grid on", async () => {
    const rectangle = await setup(true);

    rotateTo([rectangle], [147, 36]);
    expect(h.elements[0].angle).toBe(Math.PI / 2);

    rotateTo([h.elements[0]], [56, 127]);
    expect(h.elements[0].angle).toBe(Math.PI);

    rotateTo([h.elements[0]], [-47, 24]);
    expect(h.elements[0].angle).toBe((3 * Math.PI) / 2);

    rotateTo([h.elements[0]], [44, -67]);
    expect(h.elements[0].angle).toBe(0);
  });

  it("stops exactly on 90° when rotating several elements with the grid on", async () => {
    const rectangle = await setup(true);
    const ellipse = API.createElement({
      type: "ellipse",
      x: 130,
      y: 10,
      width: 50,
      height: 30,
    });
    API.setElements([rectangle, ellipse]);

    // the selection's center (90, 30) is not on a grid point
    rotateTo([rectangle, ellipse], [187, 36]);

    expect(h.elements[0].angle).toBe(Math.PI / 2);
    expect(h.elements[1].angle).toBe(Math.PI / 2);
  });

  it("keeps a free rotation with the grid off", async () => {
    const rectangle = await setup(false);

    rotateTo([rectangle], [147, 36]);

    expect(h.elements[0].angle).toBeCloseTo(
      Math.PI / 2 + Math.atan2(6, 97),
      10,
    );
  });

  it("keeps the 15° steps of Shift with the grid off", async () => {
    const rectangle = await setup(false);

    // atan2(20, 97) ≈ 11.7°, locked to the closest 15° step
    rotateTo([rectangle], [147, 50], { shift: true });

    expect(h.elements[0].angle).toBeCloseTo(
      Math.PI / 2 + SHIFT_LOCKING_ANGLE,
      10,
    );
  });
});
