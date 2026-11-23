import {
  applyDarkModeFilter,
  COLOR_PALETTE,
  DEFAULT_CANVAS_BACKGROUND_PICKS,
  getContrastRatio,
  THEME,
} from "@excalidraw/common";

import { getGroupSelectionColor } from "./interactiveScene";

const BLACK = "#000";
const WHITE = "#fff";
const DARK_THEME_BLACK = applyDarkModeFilter(BLACK);
const DARK_THEME_WHITE = applyDarkModeFilter(WHITE);

describe("getGroupSelectionColor", () => {
  describe("light theme", () => {
    it.each(DEFAULT_CANVAS_BACKGROUND_PICKS)(
      "keeps the black border on the light background %s",
      (background) => {
        expect(getGroupSelectionColor(background, THEME.LIGHT)).toBe(BLACK);
      },
    );

    it.each([COLOR_PALETTE.black, "#000000", "#343a40", "#002b5c"])(
      "switches to a white border on the dark background %s",
      (background) => {
        expect(getGroupSelectionColor(background, THEME.LIGHT)).toBe(WHITE);
      },
    );

    it("keeps black on a mid gray where black still reaches 3:1", () => {
      expect(getGroupSelectionColor("#868e96", THEME.LIGHT)).toBe(BLACK);
    });

    it("keeps black for a transparent or invalid background", () => {
      expect(getGroupSelectionColor("transparent", THEME.LIGHT)).toBe(BLACK);
      expect(getGroupSelectionColor("not-a-color", THEME.LIGHT)).toBe(BLACK);
    });
  });

  describe("dark theme", () => {
    it("keeps the current border on the default (inverted) white background", () => {
      expect(getGroupSelectionColor(COLOR_PALETTE.white, THEME.DARK)).toBe(
        DARK_THEME_BLACK,
      );
    });

    it("switches to the dark border when the background renders light", () => {
      // a black background renders near-white once the dark mode filter applies
      expect(getGroupSelectionColor(COLOR_PALETTE.black, THEME.DARK)).toBe(
        DARK_THEME_WHITE,
      );
    });
  });

  // every palette shade, both themes: the border always reaches 3:1 against
  // the background as painted on the canvas
  it.each([THEME.LIGHT, THEME.DARK])(
    "always reaches a 3:1 contrast with the painted background (%s)",
    (theme) => {
      const backgrounds = Object.values(COLOR_PALETTE)
        .flat()
        .filter((color) => color !== COLOR_PALETTE.transparent);

      const lowContrastBackgrounds = backgrounds.filter((background) => {
        const painted = applyDarkModeFilter(background, theme === THEME.DARK);
        const border = getGroupSelectionColor(background, theme);
        return getContrastRatio(border, painted) < 3;
      });

      expect(backgrounds.length).toBeGreaterThan(0);
      expect(lowContrastBackgrounds).toEqual([]);
    },
  );
});
