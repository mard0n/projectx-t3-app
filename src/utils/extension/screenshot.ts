import { fetchWebMetadata } from "~/background/messages/fetchWebMetadata";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import {
  type SerializedBlockHighlightNode,
  BLOCK_HIGHLIGHT_TYPE,
} from "~/nodes/BlockHighlight";
import { getIndexWithinParent } from ".";

export const createScreenshotData = async (
  link: string,
  screenshotDimentions: { x: number; y: number; w: number; h: number },
) => {
  const currentUrl = await getCurrentUrl();
  if (!currentUrl) return;
  const webMetadata = await fetchWebMetadata();
  if (!webMetadata) return;
  const indexWithinParent = await getIndexWithinParent(screenshotDimentions.y);
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
      highlightText: `![Screenshot](${link})`,
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
