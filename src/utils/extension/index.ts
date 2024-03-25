import { Readability } from "@mozilla/readability";
import {
  generateFragment,
  processTextFragmentDirective,
} from "./generateFragment.js";
import TurndownService from "turndown";
import { fetchHighlights } from "~/background/messages/fetchHighlights";
import { type RectType } from "./highlight.js";

export function serializeSelectionPath(range: Range) {
  const result = generateFragment(range) as {
    status: number;
    fragment: {
      textStart: string;
      textEnd?: string;
      suffix?: string;
      prefix?: string;
    };
  };
  console.log("result", result);
  let url = `${location.origin}${location.pathname}${location.search}`;
  if (result?.status === 0) {
    const fragment = result.fragment;
    if (!fragment) return "";
    const prefix = fragment.prefix
      ? `${encodeURIComponent(fragment.prefix)}-,`
      : "";
    const suffix = fragment.suffix
      ? `,-${encodeURIComponent(fragment.suffix)}`
      : "";
    const textStart = encodeURIComponent(fragment.textStart);
    const textEnd = fragment.textEnd
      ? `,${encodeURIComponent(fragment.textEnd)}`
      : "";
    url = `${url}#:~:text=${prefix}${textStart}${textEnd}${suffix}`;
    // copyToClipboard(url, selection);
    // reportSuccess();
    return url;
  } else {
    console.log("result.status", result.status);

    // reportFailure(result.status);
    // return `Could not create URL ${result.status}`;
    return "";
  }
}

export function deserializeSelectionPath(path: string): Range | null {
  let fragmentString = "";
  const fragmentMatch = path.match(/(:~:text=)(.+)/);

  if (fragmentMatch) {
    fragmentString = fragmentMatch[2]!;
  }

  if (!fragmentString) return null;

  const fragmentGroup = fragmentString.split(",");

  const prefixIndex = fragmentGroup.findIndex((str) => str.endsWith("-"));
  const prefix =
    prefixIndex >= 0 ? fragmentGroup.splice(prefixIndex, 1)[0] : null;
  const suffixIndex = fragmentGroup.findIndex((str) => str.startsWith("-"));
  const suffix =
    suffixIndex >= 0 ? fragmentGroup.splice(suffixIndex, 1)[0] : null;
  const textStart = fragmentGroup[0];
  const textEnd = fragmentGroup[1];

  // TODO Optimize by narrowing the search range
  // const anchorIdMatch = path.match(/(#)(.+)(:~:text=)/);
  // let anchorId = "",
  // if (anchorIdMatch) {
  //   anchorId = anchorIdMatch[2]!;
  // }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const foundFragments = processTextFragmentDirective({
    prefix: prefix ? decodeURIComponent(prefix.slice(0, -1)) : undefined,
    textStart: textStart ? decodeURIComponent(textStart) : undefined,
    textEnd: textEnd ? decodeURIComponent(textEnd) : undefined,
    suffix: suffix ? decodeURIComponent(suffix.slice(1)) : undefined,
  }) as Range[];

  return foundFragments?.length ? foundFragments[0]! : null;
}

export function getOffsetRectRelativeToBody(
  target: Element | DOMRect,
): RectType {
  console.log("target", target);

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

export function isAnchorBeforeFocus(selection: Selection) {
  if (!selection) return;
  let isAnchorBeforeFocus = true;
  if (selection.anchorNode === selection.focusNode) {
    if (selection.anchorOffset < selection.focusOffset) {
      isAnchorBeforeFocus = true;
    } else if (selection.anchorOffset > selection.focusOffset) {
      isAnchorBeforeFocus = false;
    } else {
    }
  } else {
    const result = selection.anchorNode?.compareDocumentPosition(
      selection.focusNode!,
    );
    // console.log("result", result)
    switch (result) {
      case Node.DOCUMENT_POSITION_PRECEDING:
        // console.log("right to left")
        isAnchorBeforeFocus = false;
        break;
      case Node.DOCUMENT_POSITION_FOLLOWING:
        // console.log("left to right")
        isAnchorBeforeFocus = true;
        break;
      case 10: // Node.DOCUMENT_POSITION_CONTAINED_BY
        // console.log("left to right")
        if (selection.anchorOffset < selection.focusOffset) {
          console.log("Selection started from left to right");
          isAnchorBeforeFocus = true;
        } else if (selection.anchorOffset > selection.focusOffset) {
          console.log("Selection started from right to left");
          isAnchorBeforeFocus = false;
        } else {
          isAnchorBeforeFocus = true;
        }
        break;
      default:
        break;
    }
  }
  return isAnchorBeforeFocus;
}

const MAIN_CONTENT_CHAR_THRESHOLD = 200;
export const checkIfSelectionInsideMainContentArea = (range: Range) => {
  const documentClone = document.cloneNode(true);
  const article = new Readability(documentClone as Document, {
    charThreshold: MAIN_CONTENT_CHAR_THRESHOLD,
  }).parse();

  if (!article) return false;

  const mainArticleText = article.title
    .concat(article.textContent)
    ?.replaceAll(/\s/g, "");

  const selectedText = range?.toString()?.replaceAll(/\s/g, "");

  if (!selectedText) return false;
  const result = mainArticleText?.includes(selectedText);

  return !!result;
};

export function getSelectionParams(range: Range): {
  text: string;
  path: string;
  rect: RectType;
} {
  const turndownService = new TurndownService();
  const html = range.cloneContents();
  const text = turndownService.turndown(html);
  const path = serializeSelectionPath(range);

  const rect = getOffsetRectRelativeToBody(range.getBoundingClientRect());

  return { text, path, rect };
}

export const getIndexWithinParent = async (highlightY: number) => {
  const highlights = await fetchHighlights();
  highlights.sort((a, b) => a.indexWithinParent - b.indexWithinParent);
  const indexOfNextSibling =
    highlights.find((h) => {
      return h.properties?.highlightRect?.y >= highlightY;
    })?.indexWithinParent ?? 0;
  const indexWithinParent = indexOfNextSibling + 0.001; // TODO: Find a better way to sort
  return indexWithinParent;
};

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
  console.log("tab", tab);
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
      console.log("highlight msg", msg);
      if (msg.type === "highlight") {
        callback(msg.type);
      }
      return true;
    },
  );
};
