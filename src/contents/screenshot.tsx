/* eslint-disable @typescript-eslint/no-floating-promises */
import { type PlasmoCSConfig } from "plasmo";
import { useEffect, useRef, useState } from "react";
import { captureScreenshot } from "~/background/messages/captureScreenshot";
import { crop } from "~/utils/extension/screenshot";
import { uploadImageToAWS } from "~/utils/extension/uploadImageToAWS";
import {
  createScreenshotData,
  getTranslateValues,
} from "~/utils/extension/screenshot";
import { useStorage } from "@plasmohq/storage/hook";
import { listenContentScriptTriggers } from "~/utils/extension";
import { CssVarsProvider, GlobalStyles, Snackbar } from "@mui/joy";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { postWebAnnotation } from "~/background/messages/postWebAnnotation";
import { preFetchWebMetadata } from "~/background/messages/fetchWebMetadata";
import { fetchHighlights } from "~/background/messages/fetchHighlights";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  exclude_matches: ["http://localhost:3000/*"],
  all_frames: true,
  run_at: "document_idle",
};

const Screenshot = () => {
  const screenshotArea = useRef<HTMLDivElement | null>(null);
  const [activateScreenshotMode, setActivateScreenshotMode] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mouseDownPosition, setMouseDownPosition] = useState({
    clientX: 0,
    clientY: 0,
  });
  const [mousePosition, setMousePosition] = useState({
    clientX: 0,
    clientY: 0,
  });
  const [snackState, setSnackState] = useState<{
    open: boolean;
  }>({ open: false });
  const { open } = snackState;
  const screenshotDimentions = useRef({ x: 0, y: 0, w: 0, h: 0 });
  useStorage<boolean>("screenshot-init", () => true);

  useEffect(() => {
    // prefetching. to increase the performance. We are using preFetch instead of fetch
    // to prevent creating unnecessary webMetadata and BlockNode on visit (before annotating)
    void preFetchWebMetadata();
    void fetchHighlights();
  }, []);

  const captureImage = async () => {
    // TODO prevent scroll while capturing. chrome.tabs.captureVisibleTab only captures visible area
    const screenshotData = await createScreenshotData(
      screenshotDimentions.current,
    );
    if (!screenshotData) return;
    void postWebAnnotation({
      updateType: "created",
      updatedBlockId: screenshotData.id,
      updatedBlock: screenshotData,
    });

    setSnackState({ ...snackState, open: true });

    const fullImage = await captureScreenshot();
    if (!fullImage) return;
    const image = await crop(
      fullImage,
      screenshotDimentions.current,
      window.devicePixelRatio,
    );
    if (!image) return;
    const url = await uploadImageToAWS(image);
    if (!url) return;
    screenshotData.properties.highlightText = `![Screenshot](${url})`;
    void postWebAnnotation({
      updateType: "updated",
      updatedBlockId: screenshotData.id,
      updatedBlock: screenshotData,
    });
  };

  useEffect(() => {
    listenContentScriptTriggers((type) => {
      if (type === "screenshot") {
        setActivateScreenshotMode(true);
      }
    });

    const handleKeypress = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyS") {
        void setActivateScreenshotMode(true);
      }
    };
    document.addEventListener("keypress", handleKeypress);
    return () => {
      document.removeEventListener("keypress", handleKeypress);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ clientX: event.clientX, clientY: event.clientY });
    };
    const handleMouseDown = (event: MouseEvent) => {
      setMouseDownPosition({ clientX: event.clientX, clientY: event.clientY });
      setIsMouseDown(true);
    };
    const handleMouseUp = () => {
      setIsMouseDown(false);
      setActivateScreenshotMode((prevValue) => {
        if (prevValue === true) {
          const area = screenshotArea.current!;
          area.style.display = "none";

          // HACK: to prevent capturing screenshotArea; Fix later.
          setTimeout(() => {
            captureImage();
          }, 100);
        }
        return false;
      });
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activateScreenshotMode]);

  useEffect(() => {
    if (activateScreenshotMode) {
      document.documentElement.style.cursor = "crosshair";
      document.documentElement.style.userSelect = "none";
    } else {
      document.documentElement.style.cursor = "unset";
      document.documentElement.style.userSelect = "unset";
    }
  }, [activateScreenshotMode]);

  useEffect(() => {
    const area = screenshotArea.current;
    if (!area) return;
    const { translateX, translateY, width, height } = getTranslateValues(
      mouseDownPosition,
      mousePosition,
    );
    if (activateScreenshotMode && isMouseDown) {
      screenshotDimentions.current = {
        x: translateX,
        y: translateY,
        w: width,
        h: height,
      };
      area.style.transform = `translate(${translateX}px, ${translateY}px)`;
      area.style.width = width + "px";
      area.style.height = height + "px";
      area.style.display = "block";
    } else {
      area.style.display = "none";
    }
  }, [
    activateScreenshotMode,
    isMouseDown,
    mouseDownPosition,
    mousePosition,
    screenshotArea.current,
  ]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          backgroundColor: "#b2d7ff",
          opacity: 0.3,
          border: "1px solid #0028ff",
          willChange: "transition",
        }}
        ref={screenshotArea}
      />
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        open={open}
        onClose={() => setSnackState({ ...snackState, open: false })}
        autoHideDuration={3000}
      >
        Image is saved
      </Snackbar>
    </>
  );
};

const queryClient = new QueryClient();
const styleElement = document.createElement("style");

const styleCache = createCache({
  key: "plasmo-joyui-cache",
  prepend: true,
  container: styleElement,
});

export const getStyle = () => styleElement;

const Wrapper = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider value={styleCache}>
        {/* https://github.com/mui/material-ui/issues/37470 */}
        <CssVarsProvider colorSchemeSelector={":host"}>
          <GlobalStyles
            styles={{
              "& .lucide": {
                color: "var(--Icon-color)",
                margin: "var(--Icon-margin)",
                fontSize: "var(--Icon-fontSize, 20px)",
              },
            }}
          />
          <Screenshot />
        </CssVarsProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
};

export default Wrapper;
