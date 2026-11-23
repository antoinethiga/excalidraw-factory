import { woff2BrowserPlugin } from "../../scripts/woff2/woff2-vite-plugins";

type FontsPlugin = {
  config: (config: object, env: { command: "build" | "serve" }) => void;
  configResolved: (config: { env: Record<string, string> }) => void;
  transform: (code: string, id: string) => string | undefined;
};

const FONTS_CSS_ID = "/repo/packages/excalidraw/fonts/fonts.css";
const INDEX_HTML_ID = "/repo/excalidraw-app/index.html";
const INDEX_HTML = "<head><!-- PLACEHOLDER:EXCALIDRAW_APP_FONTS --></head>";

const buildPlugin = (fontsCdnUrl: string) => {
  const plugin = woff2BrowserPlugin() as unknown as FontsPlugin;
  plugin.config({}, { command: "build" });
  plugin.configResolved({ env: { VITE_APP_FONTS_CDN_URL: fontsCdnUrl } });
  return plugin;
};

describe("woff2BrowserPlugin", () => {
  it("serves fonts from the app's origin when no CDN is configured", () => {
    const plugin = buildPlugin("");

    expect(plugin.transform("/* fonts */", FONTS_CSS_ID)).toBeUndefined();

    const html = plugin.transform(INDEX_HTML, INDEX_HTML_ID)!;
    expect(html).toContain('window.EXCALIDRAW_ASSET_PATH = ["/"];');
    expect(html).toContain(
      'href="/fonts/Excalifont/Excalifont-Regular-a88b72a24fb54c9f94e3b5fdaa7481c9.woff2"',
    );
    expect(html).not.toContain("https://");
  });

  it("loads fonts from the configured CDN, with the app's origin as fallback", () => {
    const plugin = buildPlugin("https://cdn.example.com/oss");

    expect(plugin.transform("/* fonts */", FONTS_CSS_ID)).toContain(
      "url(https://cdn.example.com/oss/fonts/Assistant/Assistant-Regular.woff2)",
    );

    const html = plugin.transform(INDEX_HTML, INDEX_HTML_ID)!;
    expect(html).toContain(
      'window.EXCALIDRAW_ASSET_PATH = ["https://cdn.example.com/oss/","/"];',
    );
    expect(html).toContain(
      'href="https://cdn.example.com/oss/fonts/Nunito/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3j6zbXWjgeg.woff2"',
    );
  });
});
