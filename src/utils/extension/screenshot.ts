import { fetchWebMetadata } from "~/background/messages/fetchWebMetadata";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import {
  type SerializedBlockHighlightNode,
  BLOCK_HIGHLIGHT_TYPE,
} from "~/nodes/BlockHighlight";
import { getIndexWithinHighlightsAndScreenshots } from "./highlight";

export const createScreenshotData = async (screenshotDimentions: {
  x: number;
  y: number;
  w: number;
  h: number;
}) => {
  const currentUrl = await getCurrentUrl();
  if (!currentUrl) return;
  const webMetadata = await fetchWebMetadata();
  if (!webMetadata) return;
  const indexWithinParent = await getIndexWithinHighlightsAndScreenshots(
    screenshotDimentions.y,
  );
  const { x, y, w, h } = screenshotDimentions;
  const screenshotRect = {
    left: x,
    top: y,
    bottom: y + h,
    right: x + w,
    width: w,
    height: h,
    x: x,
    y: y,
  };
  const data: SerializedBlockHighlightNode = {
    type: BLOCK_HIGHLIGHT_TYPE,
    id: crypto.randomUUID(),
    parentId: webMetadata.defaultNoteId,
    indexWithinParent: indexWithinParent,
    open: true,
    version: 1,
    childBlocks: [],
    webUrl: currentUrl,
    properties: {
      highlightText: ``,
      highlightPath: null,
      highlightRect: screenshotRect,
      commentText: "",
      commentRect: screenshotRect,
      contextRect: screenshotRect,
    },
    children: [],
    direction: null,
    format: "",
    indent: 0,
  };
  return data;
};

export const getTranslateValues = (
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

export function crop(
  image: string,
  area: { x: number; y: number; w: number; h: number },
  dpr: number,
) {
  return new Promise<Blob | null>((resolve, reject) => {
    const top = area.y * dpr;
    const left = area.x * dpr;
    const width = area.w * dpr;
    const height = area.h * dpr;

    let canvas: HTMLCanvasElement | null = null;
    let template: HTMLTemplateElement | null = null;
    if (!canvas) {
      template = document.createElement("template");
      canvas = document.createElement("canvas");
      document.body.appendChild(template);
      template.appendChild(canvas);
    }
    canvas.width = width;
    canvas.height = height;

    const img = new Image();
    img.onload = () => {
      const context = canvas?.getContext("2d");
      context?.drawImage(img, left, top, width, height, 0, 0, width, height);
      // const cropped = canvas?.toDataURL(`image/jpeg`);
      // resolve(cropped ?? null);
      canvas?.toBlob(
        (cropped) => {
          if (!cropped) reject(null);
          resolve(cropped);
        },
        `image/jpeg`,
        100,
      );
    };
    img.src = image;
  });
}
