import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@excalidraw/excalidraw/tests/test-utils";
import { vi } from "vitest";

import ExcalidrawApp from "../App";

const { h } = window;

const loadFromFirebase = vi.hoisted(() => vi.fn(async () => null));
const loadFilesFromFirebase = vi.hoisted(() =>
  vi.fn(async () => ({ loadedFiles: [], erroredFiles: new Map() })),
);
const socketIOClient = vi.hoisted(() =>
  vi.fn(() => ({
    close: () => {},
    on: () => {},
    once: () => {},
    off: () => {},
    emit: () => {},
  })),
);

vi.mock("../../excalidraw-app/data/firebase.ts", () => ({
  loadFromFirebase,
  loadFilesFromFirebase,
  saveToFirebase: () => {},
  isSavedToFirebase: () => true,
  saveFilesToFirebase: async () => ({
    savedFiles: new Map(),
    erroredFiles: new Map(),
  }),
}));

vi.mock("socket.io-client", () => ({ default: socketIOClient }));

const SERVICES_ENV = {
  VITE_APP_WS_SERVER_URL: "https://collab.example.com",
  VITE_APP_BACKEND_V2_GET_URL: "https://json.example.com/api/v2/",
  VITE_APP_BACKEND_V2_POST_URL: "https://json.example.com/api/v2/post/",
  VITE_APP_FIREBASE_CONFIG: '{"projectId":"example"}',
  VITE_APP_AI_BACKEND: "https://ai.example.com",
  VITE_APP_PLUS_LP: "https://plus.example.com",
  VITE_APP_PLUS_APP: "https://app.plus.example.com",
};

const stubServicesEnv = (configured: boolean) => {
  for (const [key, value] of Object.entries(SERVICES_ENV)) {
    vi.stubEnv(key, configured ? value : "");
  }
};

const textOf = (selector: string) =>
  document.querySelector(selector)?.textContent ?? "";

const openMainMenu = () => {
  fireEvent.click(document.querySelector("[data-testid=main-menu-trigger]")!);
  return textOf(".main-menu .dropdown-menu-container");
};

const openExtraTools = () => {
  fireEvent.click(document.querySelector(".App-toolbar__extra-tools-trigger")!);
  return document.querySelector(".App-toolbar__extra-tools-dropdown")!;
};

const openExportDialog = () => {
  openMainMenu();
  fireEvent.click(document.querySelector("[data-testid=json-export-button]")!);
  return textOf(".ExportDialog-cards");
};

const openDefaultSidebar = () => {
  act(() => {
    h.setState({ openSidebar: { name: "default" } });
  });
  return Array.from(
    document.querySelectorAll(".sidebar-tab-trigger"),
    (trigger) => trigger.id.replace(/^.*-trigger-/, ""),
  );
};

const renderApp = async () => {
  await render(<ExcalidrawApp />);
  await waitFor(() => {
    expect(h.state.isLoading).toBe(false);
  });
};

describe("Excalidraw services configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  });

  describe("when no service is configured", () => {
    beforeEach(() => {
      stubServicesEnv(false);
    });

    it("hides the share button and the Excalidraw+ banner", async () => {
      await renderApp();

      expect(document.querySelector(".collab-button")).toBeNull();
      expect(document.querySelector(".plus-banner")).toBeNull();
    });

    it("hides live collaboration and Excalidraw+ in the main menu", async () => {
      await renderApp();

      const menu = openMainMenu();
      expect(menu).toContain("Export");
      expect(menu).toContain("Save to...");
      expect(menu).not.toContain("Live collaboration");
      expect(menu).not.toContain("Excalidraw+");
      expect(menu).not.toContain("Sign up");
      expect(document.querySelector("[data-testid=collab-button]")).toBeNull();
    });

    it("hides live collaboration and sign up on the welcome screen", async () => {
      await renderApp();

      const welcomeScreen = textOf(".welcome-screen-center");
      expect(welcomeScreen).toContain("Open");
      expect(welcomeScreen).not.toContain("Live collaboration");
      expect(welcomeScreen).not.toContain("Sign up");
    });

    it("hides AI tools but keeps Mermaid to Excalidraw", async () => {
      await renderApp();

      const extraTools = openExtraTools();
      expect(extraTools.textContent).toContain("Mermaid to Excalidraw");
      expect(extraTools.textContent).not.toContain("Text to diagram");
      expect(
        extraTools.querySelector("[data-testid=toolbar-magicframe]"),
      ).toBeNull();
    });

    it("hides shareable link and Excalidraw+ export in the export dialog", async () => {
      await renderApp();

      const exportCards = openExportDialog();
      expect(exportCards).toContain("Save to disk");
      expect(exportCards).not.toContain("Shareable link");
      expect(exportCards).not.toContain("Excalidraw+");
    });

    it("hides the encryption badge and the Excalidraw+ sidebar tabs", async () => {
      await renderApp();

      expect(document.querySelector(".encrypted-icon")).toBeNull();
      const tabs = openDefaultSidebar();
      expect(tabs).toContain("library");
      expect(tabs).not.toContain("comments");
      expect(tabs).not.toContain("presentation");
    });

    it("ignores shareable links without requesting the backend", async () => {
      const fetchSpy = vi.spyOn(window, "fetch");
      window.history.replaceState({}, "", "/#json=sceneId,sceneKey");

      await renderApp();

      expect(
        fetchSpy.mock.calls.some(([url]) => String(url).includes("sceneId")),
      ).toBe(false);
      expect(loadFilesFromFirebase).not.toHaveBeenCalled();
    });

    it("ignores room links without connecting to a server", async () => {
      window.history.replaceState(
        {},
        "",
        "/#room=0123456789abcdef0123,0123456789abcdefghijkl",
      );

      await renderApp();

      expect(socketIOClient).not.toHaveBeenCalled();
      expect(loadFromFirebase).not.toHaveBeenCalled();
      expect(document.querySelector(".excalidraw-app.is-collaborating")).toBe(
        null,
      );
    });
  });

  describe("when every service is configured", () => {
    beforeEach(() => {
      stubServicesEnv(true);
    });

    it("shows the share button and the Excalidraw+ banner", async () => {
      await renderApp();

      await waitFor(() => {
        expect(document.querySelector(".collab-button")).not.toBeNull();
      });
      expect(document.querySelector(".plus-banner")).not.toBeNull();
    });

    it("shows live collaboration and Excalidraw+ in the main menu", async () => {
      await renderApp();

      const menu = openMainMenu();
      expect(menu).toContain("Live collaboration");
      expect(menu).toContain("Excalidraw+");
      expect(menu).toContain("Sign up");
    });

    it("shows live collaboration and sign up on the welcome screen", async () => {
      await renderApp();

      const welcomeScreen = textOf(".welcome-screen-center");
      expect(welcomeScreen).toContain("Live collaboration");
      expect(welcomeScreen).toContain("Sign up");
    });

    it("shows AI tools", async () => {
      await renderApp();

      const extraTools = openExtraTools();
      expect(extraTools.textContent).toContain("Text to diagram");
      expect(
        extraTools.querySelector("[data-testid=toolbar-magicframe]"),
      ).not.toBeNull();
    });

    it("shows shareable link and Excalidraw+ export in the export dialog", async () => {
      await renderApp();

      const exportCards = openExportDialog();
      expect(exportCards).toContain("Shareable link");
      expect(exportCards).toContain("Excalidraw+");
    });

    it("shows the encryption badge and the Excalidraw+ sidebar tabs", async () => {
      await renderApp();

      expect(document.querySelector(".encrypted-icon")).not.toBeNull();
      const tabs = openDefaultSidebar();
      expect(tabs).toContain("library");
      expect(tabs).toContain("comments");
      expect(tabs).toContain("presentation");
    });
  });
});
