import clsx from "clsx";

import LibraryMenuBrowseButton, {
  isLibraryBrowsingEnabled,
} from "./LibraryMenuBrowseButton";

import type { ExcalidrawProps, UIAppState } from "../types";

export const LibraryMenuControlButtons = ({
  libraryReturnUrl,
  theme,
  id,
  style,
  children,
  className,
}: {
  libraryReturnUrl: ExcalidrawProps["libraryReturnUrl"];
  theme: UIAppState["theme"];
  id: string;
  style: React.CSSProperties;
  children?: React.ReactNode;
  className?: string;
}) => {
  const isBrowsingEnabled = isLibraryBrowsingEnabled();
  if (!isBrowsingEnabled && !children) {
    return null;
  }

  return (
    <div
      className={clsx("library-menu-control-buttons", className)}
      style={style}
    >
      {isBrowsingEnabled && (
        <LibraryMenuBrowseButton
          id={id}
          libraryReturnUrl={libraryReturnUrl}
          theme={theme}
        />
      )}
      {children}
    </div>
  );
};
