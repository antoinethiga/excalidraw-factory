import { readFileSync } from "fs";
import path from "path";

import dotenv from "dotenv";

import { getAppServices } from "../app_services";

const productionEnv = dotenv.parse(
  readFileSync(path.resolve(__dirname, "../../.env.production"), "utf8"),
);

// domains and accounts of the official Excalidraw infrastructure
const EXCALIDRAW_SERVICES =
  /excalidraw\.com|excalidraw-room-persistence|excalidraw\.nyc3\.cdn|digitaloceanspaces|simpleanalyticscdn|sentry\.io/;

describe(".env.production", () => {
  it("doesn't point to any Excalidraw server", () => {
    const variablesPointingToExcalidraw = Object.entries(productionEnv)
      .filter(([, value]) => EXCALIDRAW_SERVICES.test(value))
      .map(([key]) => key);

    expect(variablesPointingToExcalidraw).toEqual([]);
  });

  it("disables every service relying on Excalidraw servers", () => {
    expect(getAppServices(productionEnv)).toEqual({
      collaboration: false,
      shareLink: false,
      ai: false,
      excalidrawPlus: false,
      excalidrawPlusExport: false,
    });
  });

  it("leaves the libraries, fonts CDN, Sentry and analytics variables empty", () => {
    for (const key of [
      "VITE_APP_LIBRARY_URL",
      "VITE_APP_LIBRARY_BACKEND",
      "VITE_APP_FONTS_CDN_URL",
      "VITE_APP_SENTRY_DSN",
      "VITE_APP_SIMPLE_ANALYTICS_SCRIPT_URL",
    ]) {
      expect(productionEnv).toHaveProperty(key, "");
    }
  });
});
