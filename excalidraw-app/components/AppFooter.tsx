import { Footer } from "@excalidraw/excalidraw/index";
import React from "react";

import { isExcalidrawPlusSignedUser } from "../app_constants";

import { DebugFooter, isVisualDebuggerEnabled } from "./DebugCanvas";
import { EncryptedIcon } from "./EncryptedIcon";

export const AppFooter = React.memo(
  ({
    onChange,
    isEncryptedIconVisible,
  }: {
    onChange: () => void;
    isEncryptedIconVisible: boolean;
  }) => {
    return (
      <Footer>
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            alignItems: "center",
          }}
        >
          {isVisualDebuggerEnabled() && <DebugFooter onChange={onChange} />}
          {isEncryptedIconVisible && !isExcalidrawPlusSignedUser && (
            <EncryptedIcon />
          )}
        </div>
      </Footer>
    );
  },
);
