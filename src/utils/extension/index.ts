import { Readability } from "@mozilla/readability";
import { generateFragment } from "./generateFragment";
import TurndownService from "turndown";

export function getSelectionPath(el: Node) {
  const stack = [];
  let textNode = "";

  while (el.parentNode !== null) {
    let sibCount = 0;
    let sibIndex = 0;

    for (const sib of el.parentNode.childNodes) {
      if (sib.nodeName === el.nodeName) {
        if (sib === el) {
          sibIndex = sibCount;
          break;
        }
        sibCount += 1;
      }
    }

    if (el.nodeType === Node.TEXT_NODE) {
      textNode = `#TEXT(${sibIndex})`;
      el = el.parentNode;
      continue;
    }

    const nodeName = CSS.escape(el.nodeName.toLowerCase());

    // Ignore `html` as a parent node
    if (nodeName === "html") break;

    if (
      el.nodeType !== Node.TEXT_NODE &&
      (el as Element).hasAttribute("id") &&
      (el as Element).id !== ""
    ) {
      stack.unshift(`#${CSS.escape((el as Element).id)}`);
      // Remove this `break` if you want the entire path
      break;
    } else if (sibIndex > 0) {
      // :nth-of-type is 1-indexed
      stack.unshift(`${nodeName}:nth-of-type(${sibIndex + 1})`);
    } else {
      stack.unshift(nodeName);
    }

    el = el.parentNode;
  }

  return stack.join(">") + "-|-" + textNode;
}

export function serializeSelectionPath({
  startContainer,
  startOffset,
  endContainer,
  endOffset,
}: {
  startContainer: Node;
  startOffset: number;
  endContainer: Node;
  endOffset: number;
}): string {
  const selectionStartPath = getSelectionPath(startContainer);
  const selectionStartOffset = startOffset;
  const selectionEndPath = getSelectionPath(endContainer);
  const selectionEndOffset = endOffset;
  return `${selectionStartPath}-|-${selectionStartOffset}-|-${selectionEndPath}-|-${selectionEndOffset}`;
}

export function deserializeSelectionPath(path: string): Range | null {
  const [
    startPath,
    startTextIndexStr,
    startOffsetStr,
    endPath,
    endTextIndexStr,
    endOffsetStr,
  ] = path.split("-|-");
  const startTextIndex = startTextIndexStr?.match(/\d+/g)?.[0];
  if (!startPath) return null;
  const startParentNode = document.querySelector(startPath);
  if (!startParentNode) return null;
  const startChildTextNodes = [...startParentNode.childNodes].filter(
    (node) => node.nodeType === Node.TEXT_NODE,
  ) as Text[];
  let startContainer: Text | Element;
  if (startTextIndex) {
    startContainer =
      startChildTextNodes[parseInt(startTextIndex)] ?? startParentNode;
  } else {
    startContainer = startParentNode;
  }
  if (!startContainer) return null;
  const startOffset = parseInt(startOffsetStr!) || 0;

  const endTextIndex = endTextIndexStr?.match(/\d+/g)?.[0];
  const endParentNode = document.querySelector(endPath!);
  if (!endParentNode) return null;
  const endChildTextNodes = [...endParentNode.childNodes].filter(
    (node) => node.nodeType === Node.TEXT_NODE,
  ) as Text[];
  let endContainer: Text | Element;
  if (endTextIndex) {
    endContainer = endChildTextNodes[parseInt(endTextIndex)] ?? endParentNode;
  } else {
    endContainer = endParentNode;
  }
  if (!endContainer) return null;
  const endOffset = parseInt(endOffsetStr!) ?? 0;
  const range = new Range();
  range.setStart(startContainer, startOffset);
  range.setEnd(endContainer, endOffset);

  return range;
}

export function getOffsetRectRelativeToBody(el: HTMLElement): DOMRect {
  const rect = el.getBoundingClientRect();

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
    toJSON: () => Object,
  };
}

export function isAnchorBeforeFocus(selection: Selection) {
  if (!selection) return;
  let isAnchorBeforeFocus = true;
  if (selection.anchorNode === selection.focusNode) {
    if (selection.anchorOffset < selection.focusOffset) {
      console.log("Selection started from left to right");
      isAnchorBeforeFocus = true;
    } else if (selection.anchorOffset > selection.focusOffset) {
      console.log("Selection started from right to left");
      isAnchorBeforeFocus = false;
    } else {
      console.log("Selection direction is ambiguous");
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
          console.log("Selection direction is ambiguous");
          isAnchorBeforeFocus = true;
        }
        break;
      default:
        break;
    }
  }
  return isAnchorBeforeFocus;
}

export function getUrlFragment(range: Range) {
  const result = generateFragment(range);
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
    // reportFailure(result.status);
    // return `Could not create URL ${result.status}`;
    return "";
  }
}

const HIGHLIGHT_CONTEXT_TAGS = [
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "UL",
  "OL",
  "PRE",
];

const getMatchingParent = (
  startingNode: Node,
  findFn: (node: Element) => boolean,
) => {
  let contextNode = null;

  let currentNode =
    startingNode instanceof Element ? startingNode : startingNode.parentElement;

  while (
    currentNode &&
    currentNode.tagName !== "ARTICLE" &&
    currentNode.tagName !== "BODY" &&
    currentNode.tagName !== "HTML"
  ) {
    if (findFn(currentNode)) {
      contextNode = currentNode;
      break;
    } else {
      currentNode = currentNode.parentNode as HTMLElement;
    }
  }
  return contextNode;
};

export function getSelectionContextRange(range: Range): Range | null {
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;

  const predicate = (node: Element) => {
    return HIGHLIGHT_CONTEXT_TAGS.includes(node.tagName);
  };
  const startContextNode = getMatchingParent(startContainer, predicate);
  const endContextNode = getMatchingParent(endContainer, predicate);
  debugger
  if (startContextNode && endContextNode) {
    const newRange = document.createRange();
    newRange.setStartBefore(startContextNode);
    newRange.setEndAfter(endContextNode); // TODO: Figure out why sometimes this doesn't work
    return newRange;
  }

  return null;
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
  rect: DOMRect;
} {
  const turndownService = new TurndownService();
  turndownService.addRule('highlight', {
    filter: ['mark'],
    replacement: function (content) {
      return '==' + content + '=='
    }
  })

  const html = range.cloneContents();
  debugger
  const text = turndownService.turndown(html);
  const path = getUrlFragment(range);
  const rect = range.getBoundingClientRect();

  return { text, path, rect };
}
