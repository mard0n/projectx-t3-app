/* eslint-disable @typescript-eslint/no-floating-promises */
import { type PlasmoCSConfig } from "plasmo";
import { useEffect, useRef, useState } from "react";
import { captureScreenshot } from "~/background/messages/captureScreenshot";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { getPreSignedUrl } from "~/background/messages/getPresignedUrl";
import { postHighlight } from "~/background/messages/postHighlight";
import {
  type SerializedBlockHighlightNode,
  BLOCK_HIGHLIGHT_TYPE,
} from "~/nodes/BlockHighlight";
import { type RouterInputs } from "~/utils/api";
import { crop } from "~/utils/extension/crop";
import { getIndexWithinParent, getParentIdOrCreate } from "./highlight";

const getTranslateValues = (
  startPosition: { clientX: number; clientY: number },
  currentPosition: { clientX: number; clientY: number },
) => {
  const { clientX: startX, clientY: startY } = startPosition;
  const { clientX: currentX, clientY: currentY } = currentPosition;

  let translateX = 0;
  let translateY = 0;
  let width = 0;
  let height = 0;
  width = Math.abs(currentX - startX);
  height = Math.abs(currentY - startY);

  if (currentX - startX > 0 && currentY - startY > 0) {
    translateX = startX;
    translateY = startY;
  } else if (currentX - startX <= 0 && currentY - startY <= 0) {
    translateX = currentX;
    translateY = currentY;
  } else if (currentX - startX <= 0 && currentY - startY > 0) {
    translateX = currentX;
    translateY = startY;
  } else if (currentX - startX > 0 && currentY - startY <= 0) {
    translateX = startX;
    translateY = currentY;
  }

  return {
    translateX,
    translateY,
    width,
    height,
  };
};

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
};

const Screenshot = () => {
  const screenshotArea = useRef<HTMLDivElement | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isOptionPressed, setIsOptionPressed] = useState(false);
  const [isSPressed, setIsSPressed] = useState(false);
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
    const fullImage = await captureScreenshot()
    if (!fullImage) return;

    const image = await crop(
      fullImage,
      screenshotDimentions.current,
      window.devicePixelRatio,
    );
    if (!image) return;

    const file = new File([image], crypto.randomUUID(), {
      lastModified: new Date().getTime(),
      type: "image/jpeg",
    });
    const filename = file.name;
    const fileType = "jpeg";
    const fullFileName = `${filename}.${fileType}`;

    const res = await getPreSignedUrl({ fullFileName });
    if (!res?.url) return;

    // It doesn't work when I move this fn into messages.
    // Save the file into AWS
    await fetch(res.url, {
      method: "PUT",
      body: image,
    });

    const link = `${process.env.PLASMO_PUBLIC_CLOUDFRONT_BASE_URL}/${fullFileName}`;

    const currentUrl = await getCurrentUrl();
    if (!currentUrl) return;

    const parentId = await getParentIdOrCreate(currentUrl);
    if (!parentId) return;

    const indexWithinParent = await getIndexWithinParent(
      screenshotDimentions.current.y,
    );

    const { x, y, w, h } = screenshotDimentions.current;

    const data: SerializedBlockHighlightNode = {
      type: BLOCK_HIGHLIGHT_TYPE,
      id: crypto.randomUUID(),
      parentId: parentId,
      indexWithinParent: indexWithinParent,
      open: true,
      version: 1,
      childBlocks: [],
      webUrl: currentUrl,
      properties: {
        highlightText: `![Screenshot](${link})`,
        highlightPath: null,
        highlightRect: {
          left: x,
          top: y,
          bottom: y + h,
          right: x + w,
          width: w,
          height: h,
          x: x,
          y: y,
        },
      },
      children: [],
      direction: null,
      format: "",
      indent: 0,
    };

    console.log("screenshot data", data);

    const update: RouterInputs["note"]["saveChanges"] = [
      {
        updateType: "created",
        updatedBlockId: data.id,
        updatedBlock: data,
      },
    ];

    await postHighlight(update);
  };

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
  const handleKeyDown = (event: KeyboardEvent) => {
    setIsShiftPressed(event.shiftKey);
    setIsOptionPressed(event.altKey);
    setIsSPressed(event.code === "KeyS");
    if (event.code === "Escape") {
      setActivateScreenshotMode(false);
    }
  };
  const handleKeyUp = (event: KeyboardEvent) => {
    setIsShiftPressed(event.shiftKey);
    setIsOptionPressed(event.altKey);
    setIsSPressed(event.code === "KeyS");
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [activateScreenshotMode]);

  useEffect(() => {
    if (isShiftPressed && isOptionPressed && isSPressed) {
      setActivateScreenshotMode(true);
    }
  }, [isShiftPressed, isOptionPressed, isSPressed]);

  useEffect(() => {
    if (activateScreenshotMode) {
      document.documentElement.style.cursor = "grab";
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
