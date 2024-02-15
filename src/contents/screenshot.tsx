/* eslint-disable @typescript-eslint/no-floating-promises */
import { type PlasmoCSConfig } from "plasmo";
import { useEffect, useRef, useState } from "react";
import { captureScreenshot } from "~/background/messages/capture";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { getPreSignedUrl } from "~/background/messages/getPresignedUrl";
import { sendHighlightToServer } from "~/background/messages/sendHighlightToServer";
import {
  type SerializedBlockHighlightNode,
  BLOCK_HIGHLIGHT_TYPE,
} from "~/nodes/BlockHighlight";
import { type RouterInputs } from "~/utils/api";
import { crop } from "~/utils/extension/crop";

const getTranslateValues = (
  startPosition: { pageX: number; pageY: number },
  currentPosition: { pageX: number; pageY: number },
) => {
  const { pageX: startX, pageY: startY } = startPosition;
  const { pageX: currentX, pageY: currentY } = currentPosition;

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

  return { translateX, translateY, width, height };
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
    pageX: 0,
    pageY: 0,
  });
  const [mousePosition, setMousePosition] = useState({
    pageX: 0,
    pageY: 0,
  });
  const screenshotDimentions = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const captureImage = async () => {
    const area = screenshotArea.current!;
    console.log("area", area);

    area.style.display = "none";
    // To prevent capturing the screenshot area box;
    setTimeout(() => {
      (async () => {
        // TODO prevent scroll while capturing. chrome.tabs.captureVisibleTab only captures visible area
        const fullImage = await captureScreenshot();
        if (!fullImage) return;

        // const image = await crop(fullImage, screenshotDimentions.current);
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
        await fetch(res.url, {
          method: "PUT",
          body: image,
        });

        const link = `${process.env.PLASMO_PUBLIC_CLOUDFRONT_BASE_URL}/${fullFileName}`;

        const currentUrl = await getCurrentUrl();
        if (!currentUrl) return;

        const data: SerializedBlockHighlightNode = {
          type: BLOCK_HIGHLIGHT_TYPE,
          id: crypto.randomUUID(),
          content: "",
          parentId: null,
          indexWithinParent: 0,
          // indexWithinParent: this.getIndexWithinParent(),
          open: true,
          version: 1,
          children: [],
          direction: null,
          format: "",
          indent: 0,
          childBlocks: [],
          highlightText: `![Screenshot](${link})`,
          highlightUrl: currentUrl,
          highlightRangePath: "",
        };

        const update: RouterInputs["note"]["saveChanges"] = [
          {
            updateType: "created",
            updatedBlockId: data.id,
            updatedBlock: data,
          },
        ];

        sendHighlightToServer(update);
      })();
    }, 300);
  };

  const handleMouseMove = (event: MouseEvent) => {
    setMousePosition({ pageX: event.pageX, pageY: event.pageY });
  };
  const handleMouseDown = (event: MouseEvent) => {
    setMouseDownPosition({ pageX: event.pageX, pageY: event.pageY });
    setIsMouseDown(true);
  };
  const handleMouseUp = () => {
    setIsMouseDown(false);
    setActivateScreenshotMode((prevValue) => {
      if (prevValue === true) {
        captureImage();
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
          display: "none",
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "#b2d7ff",
          opacity: 0.3,
          border: "1px solid #0028ff",
          willChange: "transition",
        }}
        ref={screenshotArea}
      ></div>
    </>
  );
};
export default Screenshot;
