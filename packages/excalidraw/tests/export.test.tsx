import React from "react";

import { SVG_NS } from "@excalidraw/common";

import type { FileId, FractionalIndex } from "@excalidraw/element/types";

import { actionCopyAsSvg } from "../actions/actionClipboard";
import { getDefaultAppState } from "../appState";
import * as clipboardModule from "../clipboard";
import { exportCanvas, prepareElementsForExport } from "../data";
import { getDataURL } from "../data/blob";
import * as filesystemModule from "../data/filesystem";
import { encodePngMetadata } from "../data/image";
import { serializeAsJSON } from "../data/json";
import { Excalidraw } from "../index";
import {
  decodeSvgBase64Payload,
  encodeSvgBase64Payload,
  exportScene,
} from "../scene/export";

import { API } from "./helpers/api";
import { fireEvent, render, screen, waitFor } from "./test-utils";

const { h } = window;

const testElements = [
  {
    ...API.createElement({
      type: "text",
      id: "A",
      text: "😀",
      // a valid index, as in a real scene (restoring on export would
      // otherwise re-index it, bumping its version with a random nonce)
      index: "a0" as FractionalIndex,
    }),
    // can't get jsdom text measurement to work so this is a temp hack
    // to ensure the element isn't stripped as invisible
    width: 16,
    height: 16,
  },
];

// tiny polyfill for TextDecoder.decode on which we depend
Object.defineProperty(window, "TextDecoder", {
  value: class TextDecoder {
    decode(ab: ArrayBuffer) {
      return new Uint8Array(ab).reduce(
        (acc, c) => acc + String.fromCharCode(c),
        "",
      );
    }
  },
});

describe("export", () => {
  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("export embedded png and reimport", async () => {
    const pngBlob = await API.loadFile("./fixtures/smiley.png");
    const pngBlobEmbedded = await encodePngMetadata({
      blob: pngBlob,
      metadata: serializeAsJSON(testElements, h.state, {}, "local"),
    });
    await API.drop([{ kind: "file", file: pngBlobEmbedded }]);

    await waitFor(() => {
      expect(h.elements).toEqual([
        expect.objectContaining({ type: "text", text: "😀" }),
      ]);
    });
  });

  it("test encoding/decoding scene for SVG export", async () => {
    const metadataElement = document.createElementNS(SVG_NS, "metadata");

    encodeSvgBase64Payload({
      metadataElement,
      payload: serializeAsJSON(testElements, h.state, {}, "local"),
    });

    const decoded = JSON.parse(
      decodeSvgBase64Payload({ svg: metadataElement.innerHTML }),
    );
    expect(decoded.elements).toEqual([
      expect.objectContaining({ type: "text", text: "😀" }),
    ]);
  });

  it("exports SVG at the export scale", async () => {
    const copySpy = vi
      .spyOn(clipboardModule, "copyTextToSystemClipboard")
      .mockResolvedValue();
    const exportedWidthAt = async (exportScale: number) => {
      const appState = { ...h.state, exportScale };
      const { exportedElements } = prepareElementsForExport(
        testElements,
        appState,
        false,
      );
      await exportCanvas(
        "clipboard-svg",
        exportedElements,
        appState,
        {},
        { exportingFrame: null },
      );
      const svg = copySpy.mock.lastCall![0] as string;
      return Number(/<svg[^>]* width="([\d.]+)"/.exec(svg)![1]);
    };

    expect(await exportedWidthAt(2)).toBe((await exportedWidthAt(1)) * 2);
    copySpy.mockRestore();
  });

  it("export svg-embedded scene", async () => {
    const svg = await exportScene({
      type: "svg",
      data: {
        elements: testElements,
        appState: getDefaultAppState(),
        files: {},
      },
      config: { embedScene: true },
    });
    const svgText = svg.outerHTML;

    expect(svgText).toMatchSnapshot(`svg-embdedded scene export output`);
  });

  it("import embedded png (legacy v1)", async () => {
    await API.drop([
      {
        kind: "file",
        file: await API.loadFile("./fixtures/test_embedded_v1.png"),
      },
    ]);
    await waitFor(() => {
      expect(h.elements).toEqual([
        expect.objectContaining({ type: "text", text: "test" }),
      ]);
    });
  });

  it("import embedded png (v2)", async () => {
    await API.drop([
      {
        kind: "file",
        file: await API.loadFile("./fixtures/smiley_embedded_v2.png"),
      },
    ]);
    await waitFor(() => {
      expect(h.elements).toEqual([
        expect.objectContaining({ type: "text", text: "😀" }),
      ]);
    });
  });

  it("import embedded svg (legacy v1)", async () => {
    await API.drop([
      {
        kind: "file",
        file: await API.loadFile("./fixtures/test_embedded_v1.svg"),
      },
    ]);
    await waitFor(() => {
      expect(h.elements).toEqual([
        expect.objectContaining({ type: "text", text: "test" }),
      ]);
    });
  });

  it("import embedded svg (v2)", async () => {
    await API.drop([
      {
        kind: "file",
        file: await API.loadFile("./fixtures/smiley_embedded_v2.svg"),
      },
    ]);
    await waitFor(() => {
      expect(h.elements).toEqual([
        expect.objectContaining({ type: "text", text: "😀" }),
      ]);
    });
  });

  it("exporting svg containing transformed images", async () => {
    const normalizeAngle = (angle: number) => (angle / 180) * Math.PI;

    const elements = [
      API.createElement({
        type: "image",
        fileId: "file_A",
        x: 0,
        y: 0,
        scale: [1, 1],
        width: 100,
        height: 100,
        angle: normalizeAngle(315),
      }),
      API.createElement({
        type: "image",
        fileId: "file_A",
        x: 100,
        y: 0,
        scale: [-1, 1],
        width: 50,
        height: 50,
        angle: normalizeAngle(45),
      }),
      API.createElement({
        type: "image",
        fileId: "file_A",
        x: 0,
        y: 100,
        scale: [1, -1],
        width: 100,
        height: 100,
        angle: normalizeAngle(45),
      }),
      API.createElement({
        type: "image",
        fileId: "file_A",
        x: 100,
        y: 100,
        scale: [-1, -1],
        width: 50,
        height: 50,
        angle: normalizeAngle(315),
      }),
    ];
    const appState = getDefaultAppState();
    const files = {
      file_A: {
        id: "file_A" as FileId,
        dataURL: await getDataURL(await API.loadFile("./fixtures/deer.png")),
        mimeType: "image/png",
        created: Date.now(),
        lastRetrieved: Date.now(),
      },
    } as const;

    const svg = await exportScene({
      type: "svg",
      data: {
        elements,
        appState,
        files,
      },
      config: { canvasBackgroundColor: false },
    });

    const svgText = svg.outerHTML;

    // expect 1 <image> element (deduped)
    expect(svgText.match(/<image/g)?.length).toBe(1);
    // expect 4 <use> elements (one for each excalidraw image element)
    expect(svgText.match(/<use/g)?.length).toBe(4);

    // in case of regressions, save the SVG to a file and visually compare to:
    // src/tests/fixtures/svg-image-exporting-reference.svg
    expect(svgText).toMatchSnapshot(`svg export output`);
  });
});

describe("SVG export title", () => {
  const exportSvgFromDialog = async () => {
    const saveSpy = vi
      .spyOn(filesystemModule, "fileSave")
      .mockResolvedValue(null);

    API.setAppState({ openDialog: { name: "imageExport" } });
    fireEvent.click(
      await screen.findByRole("button", { name: "Export to SVG" }),
    );

    await waitFor(() => expect(saveSpy).toHaveBeenCalled());
    const blob = await saveSpy.mock.lastCall![0];
    // jsdom's Blob has no `.text()`
    const svg = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(blob);
    });
    saveSpy.mockRestore();
    return svg;
  };

  const copySvgToClipboard = async () => {
    const copySpy = vi
      .spyOn(clipboardModule, "copyTextToSystemClipboard")
      .mockResolvedValue();
    API.executeAction(actionCopyAsSvg);
    await waitFor(() => expect(copySpy).toHaveBeenCalled());
    const svg = copySpy.mock.lastCall![0] as string;
    copySpy.mockRestore();
    return svg;
  };

  const renderScene = async (name: string) => {
    await render(<Excalidraw name={name} />);
    API.updateScene({ elements: testElements });
  };

  it("titles the SVG exported from the export dialog with the scene name", async () => {
    await renderScene("Roadmap 2025");

    const svg = await exportSvgFromDialog();

    expect(svg).toContain("<title>Roadmap 2025</title>");
    expect(svg.match(/<title>/g)).toHaveLength(1);
  });

  it("titles the SVG copied to the clipboard with the scene name", async () => {
    await renderScene("Roadmap 2025");
    API.setAppState({ selectedElementIds: { A: true } });

    const svg = await copySvgToClipboard();

    expect(svg).toContain("<title>Roadmap 2025</title>");
  });

  it("adds no <title> once the scene name is cleared in the export dialog", async () => {
    await renderScene("Roadmap 2025");
    API.setAppState({ openDialog: { name: "imageExport" } });
    fireEvent.change(await screen.findByDisplayValue("Roadmap 2025"), {
      target: { value: "" },
    });
    expect(h.state.name).toBe("");

    const svg = await exportSvgFromDialog();

    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<title");
  });

  it("escapes special characters of the scene name", async () => {
    const name = `<img src=x onerror="alert(1)"> R&D "plan"`;
    await renderScene(name);

    const svg = await exportSvgFromDialog();

    expect(svg).toContain(
      `<title>&lt;img src=x onerror="alert(1)"&gt; R&amp;D "plan"</title>`,
    );
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(parsed.querySelector("parsererror")).toBe(null);
    expect(parsed.querySelector("title")?.textContent).toBe(name);
    expect(parsed.querySelector("img")).toBe(null);
  });
});
