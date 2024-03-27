import { type RectType } from "./highlight.js";

export function getOffsetRectRelativeToBody(
  target: Element | DOMRect,
): RectType {
  const rect =
    target instanceof Element ? target.getBoundingClientRect() : target;

  // add window scroll position to get the offset position
  const left = rect.left + window.scrollX;
  const top = rect.top + window.scrollY;
  const right = rect.right + window.scrollX;
  const bottom = rect.bottom + window.scrollY;

  // polyfill missing 'x' and 'y' rect properties not returned
  // from getBoundingClientRect() by older browsers
  const x = rect.x === undefined ? left : rect.x + window.scrollX;
  const y = rect.y === undefined ? top : rect.y + window.scrollY;

  // width and height are the same
  const width = rect.width;
  const height = rect.height;

  return {
    left,
    top,
    right,
    bottom,
    x,
    y,
    width,
    height,
  };
}

type CONTENT_SCRIPT_TYPES =
  | "highlight"
  | "highlight-comment"
  | "bookmark"
  | "remark"
  | "screenshot"
  | "youtube-mark"
  | "youtube-mark-comment";

export const callContentScript = async (type: CONTENT_SCRIPT_TYPES) => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, {
      type,
    });
  }
};

export const listenContentScriptTriggers = (
  callback: (type: CONTENT_SCRIPT_TYPES) => void,
) => {
  chrome.runtime.onMessage.addListener(
    (msg: { type: CONTENT_SCRIPT_TYPES }) => {
      if (msg.type === "highlight") {
        callback(msg.type);
      }
      return true;
    },
  );
};
