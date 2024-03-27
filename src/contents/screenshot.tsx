/* eslint-disable @typescript-eslint/no-floating-promises */
import { type PlasmoCSConfig } from "plasmo";
import { useEffect, useRef, useState } from "react";
import { captureScreenshot } from "~/background/messages/captureScreenshot";
import { createHighlightPost } from "~/background/messages/postHighlight";
import { crop } from "~/utils/extension/crop";
import { uploadImageToAWS } from "~/utils/extension/uploadImageToAWS";
import {
  createScreenshotData,
  getTranslateValues,
} from "~/utils/extension/screenshot";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  exclude_matches: ["http://localhost:3000/*"],
  all_frames: true,
  run_at: "document_idle",
};

const Screenshot = () => {
  const screenshotArea = useRef<HTMLDivElement | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [activateScreenshotMode, setActivateScreenshotMode] = useState(false);
  const [mouseDownPosition, setMouseDownPosition] = useState({
    clientX: 0,
    clientY: 0,
  });
  const [mousePosition, setMousePosition] = useState({
    clientX: 0,
    clientY: 0,
  });
  const screenshotDimentions = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const captureImage = async () => {
    // TODO prevent scroll while capturing. chrome.tabs.captureVisibleTab only captures visible area
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
    const screenshotData = await createScreenshotData(
      url,
      screenshotDimentions.current,
    );
    if (!screenshotData) return;
    void createHighlightPost(screenshotData);
  };

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
    </>
  );
};
export default Screenshot;
