import { getAppServices } from "../app_services";

const CONFIGURED_ENV = {
  VITE_APP_WS_SERVER_URL: "https://collab.example.com",
  VITE_APP_BACKEND_V2_GET_URL: "https://json.example.com/api/v2/",
  VITE_APP_BACKEND_V2_POST_URL: "https://json.example.com/api/v2/post/",
  VITE_APP_FIREBASE_CONFIG: '{"projectId":"example"}',
  VITE_APP_AI_BACKEND: "https://ai.example.com",
  VITE_APP_PLUS_LP: "https://plus.example.com",
  VITE_APP_PLUS_APP: "https://app.plus.example.com",
};

describe("getAppServices", () => {
  it("enables every service when all variables are set", () => {
    expect(getAppServices(CONFIGURED_ENV)).toEqual({
      collaboration: true,
      shareLink: true,
      ai: true,
      excalidrawPlus: true,
      excalidrawPlusExport: true,
    });
  });

  it("disables every service when no variable is set", () => {
    expect(getAppServices({})).toEqual({
      collaboration: false,
      shareLink: false,
      ai: false,
      excalidrawPlus: false,
      excalidrawPlusExport: false,
    });
  });

  it("treats empty and blank values as not set", () => {
    const env = Object.fromEntries(
      Object.keys(CONFIGURED_ENV).map((key, index) => [
        key,
        index % 2 ? "" : "  ",
      ]),
    );
    expect(Object.values(getAppServices(env))).not.toContain(true);
  });

  it("requires Firebase for collaboration, shareable links and Excalidraw+ export", () => {
    expect(
      getAppServices({ ...CONFIGURED_ENV, VITE_APP_FIREBASE_CONFIG: "" }),
    ).toEqual({
      collaboration: false,
      shareLink: false,
      ai: true,
      excalidrawPlus: true,
      excalidrawPlusExport: false,
    });
  });

  it("requires the socket server for collaboration only", () => {
    const services = getAppServices({
      ...CONFIGURED_ENV,
      VITE_APP_WS_SERVER_URL: "",
    });
    expect(services.collaboration).toBe(false);
    expect(services.shareLink).toBe(true);
  });

  it("requires both backend URLs for shareable links", () => {
    expect(
      getAppServices({ ...CONFIGURED_ENV, VITE_APP_BACKEND_V2_GET_URL: "" })
        .shareLink,
    ).toBe(false);
    expect(
      getAppServices({ ...CONFIGURED_ENV, VITE_APP_BACKEND_V2_POST_URL: "" })
        .shareLink,
    ).toBe(false);
  });

  it("requires both Excalidraw+ URLs for Excalidraw+ entries", () => {
    const services = getAppServices({
      ...CONFIGURED_ENV,
      VITE_APP_PLUS_APP: "",
    });
    expect(services.excalidrawPlus).toBe(false);
    expect(services.excalidrawPlusExport).toBe(false);
  });
});
