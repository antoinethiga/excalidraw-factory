import React from "react";

import { Excalidraw } from "../../index";
import { act, render } from "../../tests/test-utils";

import { CommandPalette } from "./CommandPalette";

const { h } = window;

const openCommandPalette = () => {
  act(() => {
    h.setState({ openDialog: { name: "commandPalette" } });
  });
  return document.querySelector(".command-palette-dialog")?.textContent ?? "";
};

describe("CommandPalette", () => {
  it("lists Mermaid to Excalidraw but not text to diagram when AI is disabled", async () => {
    await render(
      <Excalidraw aiEnabled={false}>
        <CommandPalette />
      </Excalidraw>,
    );

    const palette = openCommandPalette();
    expect(palette).toContain("Mermaid to Excalidraw");
    expect(palette).not.toContain("Text to diagram");
  });

  it("lists Mermaid to Excalidraw and text to diagram when AI is enabled", async () => {
    await render(
      <Excalidraw>
        <CommandPalette />
      </Excalidraw>,
    );

    const palette = openCommandPalette();
    expect(palette).toContain("Mermaid to Excalidraw");
    expect(palette).toContain("Text to diagram");
  });
});
