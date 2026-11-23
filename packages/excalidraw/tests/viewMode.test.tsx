import React from "react";
import { vi } from "vitest";

import {
  CANVAS_SHIFT_TRANSLATE_AMOUNT,
  CANVAS_TRANSLATE_AMOUNT,
  CURSOR_TYPE,
  KEYS,
} from "@excalidraw/common";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Keyboard, Pointer, UI } from "./helpers/ui";
import { getTextEditor, updateTextEditor } from "./queries/dom";
import {
  act,
  fireEvent,
  render,
  GlobalTestState,
  mockBoundingClientRect,
  restoreOriginalGetBoundingClientRect,
  waitFor,
} from "./test-utils";

import type { NormalizedZoomValue } from "../types";

const { h } = window;

const queryContainer = (selector: string) =>
  GlobalTestState.renderResult.container.querySelector(selector);

const mouse = new Pointer("mouse");
const touch = new Pointer("touch");
const pen = new Pointer("pen");
const pointerTypes = [mouse, touch, pen];

describe("view mode", () => {
  beforeEach(async () => {
    mockBoundingClientRect();
    await render(<Excalidraw handleKeyboardGlobally={true} />);
    await waitFor(() => expect(h.state.width).toBe(200));
  });

  afterEach(() => {
    restoreOriginalGetBoundingClientRect();
  });

  it("after switching to view mode – cursor type should be pointer", async () => {
    API.setAppState({ viewModeEnabled: true });
    expect(GlobalTestState.interactiveCanvas.style.cursor).toBe(
      CURSOR_TYPE.GRAB,
    );
  });

  it("after switching to view mode, moving, clicking, and pressing space key – cursor type should be pointer", async () => {
    API.setAppState({ viewModeEnabled: true });

    pointerTypes.forEach((pointerType) => {
      const pointer = pointerType;
      pointer.reset();
      pointer.move(100, 100);
      pointer.click();
      Keyboard.keyPress(KEYS.SPACE);
      expect(GlobalTestState.interactiveCanvas.style.cursor).toBe(
        CURSOR_TYPE.GRAB,
      );
    });
  });

  it("dispatches pointer events to custom tools in view mode", () => {
    const onPointerDown = vi.fn();
    const onPointerUp = vi.fn();

    GlobalTestState.renderResult.rerender(
      <Excalidraw
        handleKeyboardGlobally={true}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />,
    );

    API.setAppState({ viewModeEnabled: true });
    act(() => {
      h.app.setActiveTool({
        type: "custom",
        customType: "comment",
        locked: true,
      });
    });
    expect(h.app.isInteractionEnabled()).toBe(true);

    const { scrollX, scrollY } = h.state;

    mouse.reset();
    mouse.downAt(50, 50);
    mouse.moveTo(100, 100);
    mouse.upAt(100, 100);

    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerDown.mock.calls[0][0]).toMatchObject({
      type: "custom",
      customType: "comment",
    });
    expect(onPointerUp).toHaveBeenCalledTimes(1);
    expect(onPointerUp.mock.calls[0][0]).toMatchObject({
      type: "custom",
      customType: "comment",
    });
    expect([h.state.scrollX, h.state.scrollY]).toEqual([scrollX, scrollY]);
  });

  it("cursor should stay as grabbing type when hovering over canvas elements", async () => {
    // create a rectangle, then hover over it – cursor should be
    // move type for mouse and grab for touch & pen
    // then switch to view-mode and cursor should be grabbing type
    UI.createElement("rectangle", { size: 100 });

    pointerTypes.forEach((pointerType) => {
      const pointer = pointerType;

      pointer.moveTo(50, 50);
      // eslint-disable-next-line dot-notation
      if (pointerType["pointerType"] === "mouse") {
        expect(GlobalTestState.interactiveCanvas.style.cursor).toBe(
          CURSOR_TYPE.MOVE,
        );
      } else {
        expect(GlobalTestState.interactiveCanvas.style.cursor).toBe(
          CURSOR_TYPE.GRAB,
        );
      }

      API.setAppState({ viewModeEnabled: true });
      expect(GlobalTestState.interactiveCanvas.style.cursor).toBe(
        CURSOR_TYPE.GRAB,
      );
    });
  });

  it("submits active text editing when entering view mode", async () => {
    const text = API.createElement({
      type: "text",
      text: "before",
      x: 20,
      y: 20,
    });
    API.setElements([text]);
    API.setSelectedElements([text]);
    Keyboard.keyPress(KEYS.ENTER);

    const editor = await getTextEditor();
    updateTextEditor(editor, "committed before view mode");

    GlobalTestState.renderResult.rerender(
      <Excalidraw viewModeEnabled={true} handleKeyboardGlobally={true} />,
    );

    await waitFor(() => {
      expect(h.state.editingTextElement).toBe(null);
      expect(queryContainer(".excalidraw-wysiwyg")).toBe(null);
    });
    expect(h.elements.find((element) => element.id === text.id)).toMatchObject({
      originalText: "committed before view mode",
    });
  });

  it("commits frame-name editing when entering view mode", async () => {
    const frame = API.createElement({
      type: "frame",
      x: 20,
      y: 30,
      width: 80,
      height: 50,
    });
    API.setElements([frame]);
    API.updateElement(frame, { name: "before" });
    API.setAppState({ editingFrame: frame.id });

    const frameNameInput = await waitFor(() => {
      const input = queryContainer(".frame-name input");
      expect(input).not.toBe(null);
      return input as HTMLInputElement;
    });
    fireEvent.change(frameNameInput, { target: { value: "  committed  " } });

    API.setAppState({ viewModeEnabled: true });

    await waitFor(() => {
      expect(h.state.editingFrame).toBe(null);
      expect(queryContainer(".frame-name input")).toBe(null);
    });
    expect(h.elements.find((element) => element.id === frame.id)).toMatchObject(
      { name: "committed" },
    );
  });

  describe("arrow keys", () => {
    it("pan the canvas by a step, in the page-scroll direction", () => {
      API.setAppState({ viewModeEnabled: true, scrollX: 0, scrollY: 0 });

      Keyboard.keyPress(KEYS.ARROW_RIGHT);
      expect([h.state.scrollX, h.state.scrollY]).toEqual([
        -CANVAS_TRANSLATE_AMOUNT,
        0,
      ]);

      Keyboard.keyPress(KEYS.ARROW_DOWN);
      expect([h.state.scrollX, h.state.scrollY]).toEqual([
        -CANVAS_TRANSLATE_AMOUNT,
        -CANVAS_TRANSLATE_AMOUNT,
      ]);

      Keyboard.keyPress(KEYS.ARROW_LEFT);
      Keyboard.keyPress(KEYS.ARROW_LEFT);
      Keyboard.keyPress(KEYS.ARROW_UP);
      Keyboard.keyPress(KEYS.ARROW_UP);
      expect([h.state.scrollX, h.state.scrollY]).toEqual([
        CANVAS_TRANSLATE_AMOUNT,
        CANVAS_TRANSLATE_AMOUNT,
      ]);
    });

    it("pan by a bigger step with shift", () => {
      API.setAppState({ viewModeEnabled: true, scrollX: 0, scrollY: 0 });

      Keyboard.withModifierKeys({ shift: true }, () => {
        Keyboard.keyPress(KEYS.ARROW_LEFT);
        Keyboard.keyPress(KEYS.ARROW_DOWN);
      });

      expect(CANVAS_SHIFT_TRANSLATE_AMOUNT).toBeGreaterThan(
        CANVAS_TRANSLATE_AMOUNT,
      );
      expect([h.state.scrollX, h.state.scrollY]).toEqual([
        CANVAS_SHIFT_TRANSLATE_AMOUNT,
        -CANVAS_SHIFT_TRANSLATE_AMOUNT,
      ]);
    });

    it("keep the same on-screen step whatever the zoom", () => {
      API.setAppState({
        viewModeEnabled: true,
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 2 as NormalizedZoomValue },
      });

      Keyboard.keyPress(KEYS.ARROW_RIGHT);

      expect(h.state.scrollX).toBe(-CANVAS_TRANSLATE_AMOUNT / 2);
    });

    it("do not move elements in view mode", () => {
      const rectangle = API.createElement({ type: "rectangle", x: 10, y: 20 });
      API.setElements([rectangle]);
      API.setSelectedElements([rectangle]);
      API.setAppState({ viewModeEnabled: true });

      Keyboard.keyPress(KEYS.ARROW_RIGHT);

      expect([h.elements[0].x, h.elements[0].y]).toEqual([10, 20]);
    });

    it("leave ctrl/alt/cmd + arrow to the other shortcuts", () => {
      API.setAppState({ viewModeEnabled: true, scrollX: 0, scrollY: 0 });

      Keyboard.withModifierKeys({ ctrl: true }, () => {
        Keyboard.keyPress(KEYS.ARROW_RIGHT);
      });
      Keyboard.withModifierKeys({ alt: true }, () => {
        Keyboard.keyPress(KEYS.ARROW_RIGHT);
      });

      expect([h.state.scrollX, h.state.scrollY]).toEqual([0, 0]);
    });

    it("respect the scroll constraints", () => {
      act(() => {
        h.app.viewport.setViewport({
          target: [0, 0, 1000, 1000],
          fit: "scale-down",
          animation: false,
          lock: { scroll: true, overscroll: false },
        });
      });
      API.setAppState({ viewModeEnabled: true });
      expect(h.state.scrollY).toBe(0);

      // pan up past the top edge (max scrollY = 0)
      for (let i = 0; i < 20; i++) {
        Keyboard.keyPress(KEYS.ARROW_UP);
      }

      expect(h.state.scrollY).toBe(0);
    });
  });
});
