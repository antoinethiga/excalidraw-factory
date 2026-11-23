import React from "react";

import { KEYS, reseed } from "@excalidraw/common";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { assertSelectedElements, render, unmountComponent } from "./test-utils";

unmountComponent();

const { h } = window;

const createRectangle = (x: number, groupIds: string[] = []) =>
  API.createElement({
    type: "rectangle",
    x,
    y: 0,
    width: 50,
    height: 50,
    groupIds,
  });

describe("Enter on a selected group", () => {
  beforeEach(async () => {
    localStorage.clear();
    reseed(7);
    await render(<Excalidraw handleKeyboardGlobally={true} />);
  });

  it("enters the group, selecting its children, like a double-click", () => {
    const a = createRectangle(0, ["group"]);
    const b = createRectangle(100, ["group"]);
    API.setElements([a, b]);
    API.setSelectedElements([a, b]);
    expect(h.state.selectedGroupIds).toEqual({ group: true });

    Keyboard.keyPress(KEYS.ENTER);

    expect(h.state.editingGroupId).toBe("group");
    expect(h.state.selectedGroupIds).toEqual({});
    assertSelectedElements([a.id, b.id]);
  });

  it("keeps nested groups grouped and enters them on the next Enter", () => {
    const a = createRectangle(0, ["inner", "outer"]);
    const b = createRectangle(100, ["inner", "outer"]);
    const c = createRectangle(200, ["outer"]);
    API.setElements([a, b, c]);
    API.setSelectedElements([a, b, c]);
    expect(h.state.selectedGroupIds).toEqual({ outer: true });

    Keyboard.keyPress(KEYS.ENTER);

    expect(h.state.editingGroupId).toBe("outer");
    expect(h.state.selectedGroupIds).toEqual({ inner: true });
    assertSelectedElements([a.id, b.id, c.id]);

    API.setSelectedElements([a, b], "outer");
    Keyboard.keyPress(KEYS.ENTER);

    expect(h.state.editingGroupId).toBe("inner");
    expect(h.state.selectedGroupIds).toEqual({});
    assertSelectedElements([a.id, b.id]);

    // Escape goes back up one level only
    Keyboard.keyPress(KEYS.ESCAPE);

    expect(h.state.editingGroupId).toBe("outer");
    expect(h.state.selectedGroupIds).toEqual({ inner: true });
    assertSelectedElements([a.id, b.id]);
  });

  it("leaves the group on Escape, selecting the whole group again", () => {
    const a = createRectangle(0, ["group"]);
    const b = createRectangle(100, ["group"]);
    API.setElements([a, b]);
    API.setSelectedElements([a, b]);

    Keyboard.keyPress(KEYS.ENTER);
    expect(h.state.editingGroupId).toBe("group");

    Keyboard.keyPress(KEYS.ESCAPE);

    expect(h.state.editingGroupId).toBe(null);
    expect(h.state.selectedGroupIds).toEqual({ group: true });
    assertSelectedElements([a.id, b.id]);
  });

  it("does nothing with several groups selected", () => {
    const a = createRectangle(0, ["group1"]);
    const b = createRectangle(100, ["group1"]);
    const c = createRectangle(200, ["group2"]);
    const d = createRectangle(300, ["group2"]);
    API.setElements([a, b, c, d]);
    API.setSelectedElements([a, b, c, d]);
    expect(h.state.selectedGroupIds).toEqual({ group1: true, group2: true });

    Keyboard.keyPress(KEYS.ENTER);

    expect(h.state.editingGroupId).toBe(null);
    expect(h.state.selectedGroupIds).toEqual({ group1: true, group2: true });
    assertSelectedElements([a.id, b.id, c.id, d.id]);
  });

  it("does nothing with a group selected along with an ungrouped element", () => {
    const a = createRectangle(0, ["group"]);
    const b = createRectangle(100, ["group"]);
    const c = createRectangle(200);
    API.setElements([a, b, c]);
    API.setSelectedElements([a, b, c]);

    Keyboard.keyPress(KEYS.ENTER);

    expect(h.state.editingGroupId).toBe(null);
    expect(h.state.selectedGroupIds).toEqual({ group: true });
    assertSelectedElements([a.id, b.id, c.id]);
  });

  it("does not enter the group on CtrlOrCmd+Enter", () => {
    const a = createRectangle(0, ["group"]);
    const b = createRectangle(100, ["group"]);
    API.setElements([a, b]);
    API.setSelectedElements([a, b]);

    Keyboard.withModifierKeys({ ctrl: true }, () => {
      Keyboard.keyPress(KEYS.ENTER);
    });

    expect(h.state.editingGroupId).toBe(null);
    expect(h.state.selectedGroupIds).toEqual({ group: true });
  });

  it("selects a grouped labeled container without its label", () => {
    const [container, label] = API.createTextContainer({
      groupIds: ["group"],
    });
    const b = createRectangle(200, ["group"]);
    API.setElements([container, label, b]);
    API.setSelectedElements([container, label, b]);

    Keyboard.keyPress(KEYS.ENTER);

    expect(h.state.editingGroupId).toBe("group");
    assertSelectedElements([container.id, b.id]);
    expect(h.state.editingTextElement).toBe(null);
  });
});

describe("Enter on text, unchanged", () => {
  beforeEach(async () => {
    localStorage.clear();
    reseed(7);
    await render(<Excalidraw handleKeyboardGlobally={true} />);
  });

  it("edits a selected text", () => {
    const text = API.createElement({ type: "text", text: "hello" });
    API.setElements([text]);
    API.setSelectedElements([text]);

    Keyboard.keyPress(KEYS.ENTER);

    expect(h.state.editingTextElement?.id).toBe(text.id);
    expect(h.state.editingGroupId).toBe(null);
  });

  it("edits the label of a selected text container", () => {
    const [container, label] = API.createTextContainer();
    API.setElements([container, label]);
    API.setSelectedElements([container]);

    Keyboard.keyPress(KEYS.ENTER);

    expect(h.state.editingTextElement?.id).toBe(label.id);
    expect(h.state.editingGroupId).toBe(null);
  });

  it("enters a group holding a text, then edits that text on the next Enter", () => {
    const text = API.createElement({
      type: "text",
      text: "hello",
      groupIds: ["group"],
    });
    const rectangle = createRectangle(100, ["group"]);
    API.setElements([text, rectangle]);
    API.setSelectedElements([text, rectangle]);

    Keyboard.keyPress(KEYS.ENTER);

    expect(h.state.editingGroupId).toBe("group");
    expect(h.state.editingTextElement).toBe(null);

    API.setSelectedElements([text], "group");
    Keyboard.keyPress(KEYS.ENTER);

    expect(h.state.editingTextElement?.id).toBe(text.id);
  });
});
