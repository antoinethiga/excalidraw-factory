/**
 * @vitest-environment-options { "url": "https://excalidraw-factory.vercel.app/" }
 */
import { vi } from "vitest";

const init = vi.hoisted(() => vi.fn());

vi.mock("@sentry/browser", () => ({
  init,
  getClient: () => undefined,
  captureConsoleIntegration: () => ({}),
  featureFlagsIntegration: () => ({}),
}));

const loadSentry = async (env: Record<string, string>) => {
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }
  vi.resetModules();
  await import("../sentry");
  return init.mock.calls[0][0];
};

describe("sentry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    init.mockClear();
  });

  it("runs on a *.vercel.app host", () => {
    expect(window.location.hostname).toBe("excalidraw-factory.vercel.app");
  });

  it("doesn't report errors when no DSN is configured", async () => {
    const options = await loadSentry({ VITE_APP_SENTRY_DSN: "" });

    expect(options.dsn).toBeUndefined();
    expect(options.environment).toBeUndefined();
  });

  it("reports errors to the configured DSN", async () => {
    const options = await loadSentry({
      VITE_APP_SENTRY_DSN: "https://key@sentry.example.com/1",
    });

    expect(options.dsn).toBe("https://key@sentry.example.com/1");
    expect(options.environment).toBe("staging");
  });

  it("doesn't report errors when Sentry is explicitly disabled", async () => {
    const options = await loadSentry({
      VITE_APP_SENTRY_DSN: "https://key@sentry.example.com/1",
      VITE_APP_DISABLE_SENTRY: "true",
    });

    expect(options.dsn).toBeUndefined();
  });
});
