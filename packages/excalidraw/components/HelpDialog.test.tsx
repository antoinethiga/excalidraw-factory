import React from "react";

import { KEYS } from "@excalidraw/common";

import { Excalidraw } from "../index";
import { Keyboard } from "../tests/helpers/ui";
import { render } from "../tests/test-utils";

describe("HelpDialog", () => {
  it("lists the view-mode arrow-key canvas panning shortcut", async () => {
    await render(
      <Excalidraw viewModeEnabled={true} handleKeyboardGlobally={true} />,
    );

    Keyboard.keyPress(KEYS.QUESTION_MARK);

    const shortcut = Array.from(
      document.querySelectorAll(".HelpDialog__shortcut"),
    ).find((row) => row.textContent?.startsWith("Move canvas (view mode)"));
    expect(shortcut).toBeDefined();
    const keys = Array.from(
      shortcut!.querySelectorAll(".HelpDialog__key"),
      (key) => key.textContent,
    );
    expect(keys).toEqual(["Arrow Key", "Shift", "Arrow Key"]);
  });
});
