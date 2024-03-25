import { z } from "zod";
import { fetchWebMetadata } from "~/background/messages/fetchWebMetadata";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import {
  BLOCK_HIGHLIGHT_TYPE,
  type SerializedBlockHighlightNode,
} from "~/nodes/BlockHighlight";
import {
  getSelectionParams,
  getIndexWithinParent,
  getOffsetRectRelativeToBody,
} from "~/utils/extension";

export const HIGHLIGHT_TAGNAME = "PROJECTX-HIGHLIGHT";
export const HIGHLIGHT_DATA_ATTRIBUTE = "data-highlight-id";

export const RectSchema = z.object({
  bottom: z.number(),
  height: z.number(),
  left: z.number(),
  right: z.number(),
  top: z.number(),
  width: z.number(),
  x: z.number(),
  y: z.number(),
});

export type RectType = z.infer<typeof RectSchema>;

const surroundTextWithWrapper = (
  startContainer: Node,
  startOffset: number,
  endContainer: Node,
  endOffset: number,
  highlightId: string,
) => {
  const wrapper = document.createElement(HIGHLIGHT_TAGNAME);
  // HACK: couldn't figure out how to add global styles
  wrapper.style.backgroundColor = "hsl(208.05deg 100% 84.9%)";
  wrapper.style.cursor = "pointer";
  wrapper.style.userSelect = "none";
  wrapper.setAttribute(HIGHLIGHT_DATA_ATTRIBUTE, highlightId);
  const customRange = document.createRange();
  customRange.setStart(startContainer, startOffset);
  customRange.setEnd(endContainer, endOffset);
  customRange.surroundContents(wrapper);
  window.getSelection()?.removeRange(customRange);
};

export const applyHighlightText = (range: Range, highlightId: string) => {
  const {
    commonAncestorContainer,
    startContainer,
    startOffset,
    endContainer,
    endOffset,
  } = range.cloneRange();

  function getNextNode(node: Node, container: Node) {
    if (node.firstChild) {
      return node.firstChild;
    }

    while (node) {
      if (node.nextSibling) {
        return node.nextSibling;
      }

      if (node.parentNode) {
        node = node.parentNode;
      } else {
        console.error("no parentNode");
        break;
      }

      if (node === container) {
        break;
      }
    }

    return null;
  }

  let currentNode: Node | Text | null = startContainer;

  if (currentNode === startContainer && currentNode === endContainer) {
    surroundTextWithWrapper(
      startContainer,
      startOffset,
      endContainer,
      endOffset,
      highlightId,
    );
    return;
  }

  while (currentNode) {
    const nextNodeBeforeWrapperApplied = getNextNode(
      currentNode,
      commonAncestorContainer,
    );

    if (currentNode.nodeType !== Node.TEXT_NODE) {
      currentNode = nextNodeBeforeWrapperApplied;
      continue;
    }
    const textNode = currentNode as Text;

    if (
      startContainer.nodeType === Node.TEXT_NODE &&
      textNode === startContainer
    ) {
      surroundTextWithWrapper(
        startContainer,
        startOffset,
        startContainer,
        (startContainer as Text).length,
        highlightId,
      );
      currentNode = nextNodeBeforeWrapperApplied;
      continue;
    }

    if (textNode === endContainer) {
      surroundTextWithWrapper(
        endContainer,
        0,
        endContainer,
        endOffset,
        highlightId,
      );
      break;
    }

    surroundTextWithWrapper(
      textNode,
      0,
      textNode,
      textNode.length,
      highlightId,
    );
    currentNode = nextNodeBeforeWrapperApplied;
  }
};

export const createHighlightData = async (
  range: Range,
  highlights?: SerializedBlockHighlightNode[],
) => {
  const currentUrl = await getCurrentUrl();
  if (!currentUrl) return;

  const highlightId = crypto.randomUUID();

  const {
    text: highlightText,
    path: highlightPath,
    rect: highlightRect,
  } = getSelectionParams(range);

  if (!highlightPath || !highlightText) return;

  const webMetadata = await fetchWebMetadata();
  if (!webMetadata) return;

  const indexWithinParent = await getIndexWithinParent(highlightRect.y);

  const contextRange = getSelectionContextRange(range);
  let contextRect;
  if (contextRange) {
    contextRect = getOffsetRectRelativeToBody(
      contextRange.getBoundingClientRect(),
    );
  }

  let commentRect: RectType = {
    top: highlightRect.top,
    left: highlightRect.right + 20,
    bottom: highlightRect.top,
    height: 0,
    right: highlightRect.right + 20 + 300,
    width: 300,
    x: highlightRect.right + 20,
    y: highlightRect.top,
  };
  if (contextRect && highlightRect) {
    commentRect = {
      top: highlightRect.top,
      left: contextRect.right + 20,
      bottom: highlightRect.top,
      height: 0,
      right: contextRect.right + 20 + 300,
      width: 300,
      x: contextRect.right + 20,
      y: highlightRect.top,
    };
  }

  const isOverlapOtherComments = highlights?.some((hl) => {
    const hlTop = hl.properties.commentRect.top;
    const hlBottom = hl.properties.commentRect.bottom;

    if (!hl.properties.commentText) return false;
    if (hl.id === highlightId) return false;

    if (hlTop <= commentRect.top && commentRect.top <= hlBottom) {
      return true;
    }
  });

  if (isOverlapOtherComments) {
    commentRect.left = commentRect.left + 20;
    commentRect.top = commentRect.top + 20;
  }

  // TODO: need to figure out ways to sync this data and BlockHighlightParagraph or easier way to create data
  const newHighlight: SerializedBlockHighlightNode = {
    type: BLOCK_HIGHLIGHT_TYPE,
    id: highlightId,
    parentId: webMetadata.defaultNoteId,
    indexWithinParent: indexWithinParent,
    open: true,
    version: 1,
    childBlocks: [],
    children: [],
    format: "",
    indent: 0,
    direction: null,
    webUrl: currentUrl,
    properties: {
      highlightText: highlightText,
      highlightPath: highlightPath,
      highlightRect: highlightRect,
      commentText: "",
      commentRect: commentRect,
      contextRect: contextRect ?? highlightRect,
    },
  };
  return newHighlight;
};

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
];

const getValidContextParentNode = (node: Node) => {
  let contextNode = null;
  while (node) {
    const parentNode = node.parentNode;

    if (!parentNode) break;
    if (!(parentNode instanceof Element)) {
      node = parentNode;
      continue;
    }

    if (HIGHLIGHT_CONTEXT_TAGS.includes(parentNode.tagName)) {
      contextNode = parentNode;
      break;
    } else if (
      parentNode.tagName === "ARTICLE" ||
      parentNode.tagName === "BODY" ||
      parentNode.tagName === "HTML"
    ) {
      contextNode = null;
      break;
    } else {
      node = parentNode;
    }
  }
  return contextNode;
};

export function getSelectionContextRange(range: Range): Range | null {
  if (!range) return null;

  const commonAncestorContainer = range.commonAncestorContainer;
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  const newRange = range.cloneRange();

  // First case: both start and end are in the same container
  if (
    commonAncestorContainer === startContainer ||
    commonAncestorContainer === endContainer
  ) {
    const contextNode = getValidContextParentNode(commonAncestorContainer);

    if (contextNode) {
      newRange.selectNodeContents(contextNode);
    }
  } else if (
    commonAncestorContainer instanceof Element &&
    HIGHLIGHT_CONTEXT_TAGS.includes(commonAncestorContainer.tagName)
  ) {
    // Second case: start and end points are in different nodes but the commonAncestorContainer is a valid context node.
    newRange.selectNodeContents(commonAncestorContainer);
  } else {
    // Third case: start and end points are in different nodes
    const startContextNode = getValidContextParentNode(startContainer);
    const endContextNode = getValidContextParentNode(endContainer);

    if (startContextNode && endContextNode) {
      newRange.setStartBefore(startContextNode);
      newRange.setEndAfter(endContextNode); // TODO: Figure out why sometimes this doesn't work
      // newRange.setEnd(endContextNode, 0);
    }
  }

  return newRange;
}

export const activateHighlight = (highlightId: string, isActive: boolean) => {
  const highlightElems = document.querySelectorAll<HTMLElement>(
    `${HIGHLIGHT_TAGNAME}[${HIGHLIGHT_DATA_ATTRIBUTE}="${highlightId}"]`,
  );
  console.log("highlightElems", highlightElems);

  highlightElems.forEach((hlElem) => {
    hlElem.style.backgroundColor = isActive
      ? "hsl(208.05deg 100% 75%)"
      : "hsl(208.05deg 100% 84.9%)";
  });
};
