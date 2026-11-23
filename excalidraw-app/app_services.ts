type ServicesEnv = Partial<
  Pick<
    ImportMetaEnv,
    | "VITE_APP_WS_SERVER_URL"
    | "VITE_APP_BACKEND_V2_GET_URL"
    | "VITE_APP_BACKEND_V2_POST_URL"
    | "VITE_APP_FIREBASE_CONFIG"
    | "VITE_APP_AI_BACKEND"
    | "VITE_APP_PLUS_LP"
    | "VITE_APP_PLUS_APP"
  >
>;

export type AppServices = {
  /** live collaboration (socket server + Firebase) */
  collaboration: boolean;
  /** shareable links (#json=) stored on the JSON backend + Firebase */
  shareLink: boolean;
  /** text-to-diagram and diagram-to-code AI backend */
  ai: boolean;
  /** Excalidraw+ links and promos */
  excalidrawPlus: boolean;
  /** "Export to Excalidraw+" (uploads files to Firebase) */
  excalidrawPlusExport: boolean;
};

const isSet = (value: string | undefined) => !!value?.trim();

/**
 * A service is enabled only when every variable it needs is set. Leaving a
 * variable empty turns the service, and the UI entries depending on it, off.
 */
export const getAppServices = (env: ServicesEnv): AppServices => {
  const firebase = isSet(env.VITE_APP_FIREBASE_CONFIG);
  const excalidrawPlus =
    isSet(env.VITE_APP_PLUS_LP) && isSet(env.VITE_APP_PLUS_APP);

  return {
    collaboration: isSet(env.VITE_APP_WS_SERVER_URL) && firebase,
    shareLink:
      isSet(env.VITE_APP_BACKEND_V2_GET_URL) &&
      isSet(env.VITE_APP_BACKEND_V2_POST_URL) &&
      firebase,
    ai: isSet(env.VITE_APP_AI_BACKEND),
    excalidrawPlus,
    excalidrawPlusExport: excalidrawPlus && firebase,
  };
};
