import { type PlasmoCSConfig } from "plasmo";
import { useEffect, useRef, useState } from "react";
import { fetchNoteHighlightContainer } from "~/background/messages/fetchNoteHighlightContainer";
import { fetchHighlights } from "~/background/messages/fetchHighlights";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { postNote } from "~/background/messages/postNote";
import { postHighlight } from "~/background/messages/postHighlight";
import {
  BLOCK_HIGHLIGHT_TYPE,
  type SerializedBlockHighlightNode,
} from "~/nodes/BlockHighlight";
import {
  BLOCK_NOTE_TYPE,
  type SerializedBlockNoteNode,
} from "~/nodes/BlockNote";
import { type UpdatedBlock } from "~/plugins/SendingUpdatesPlugin";
import {
  checkIfSelectionInsideMainContentArea,
  deserializeSelectionPath,
  getOffsetRectRelativeToBody,
  getSelectionParams,
  isAnchorBeforeFocus,
} from "~/utils/extension";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  exclude_matches: ["https://*.youtube.com/*"],
  all_frames: true,
  run_at: "document_idle",
};

const HIGHLIGHT_TAGNAME = "PROJECTX-HIGHLIGHT";
const HIGHLIGHT_DELETE_TAGNAME = "PROJECTX-HIGHLIGHT-DELETE";
const DATA_HIGHLIGHT_ID = "data-highlight-id";
const TOOLTIP_WIDTH = 24;
const TOOLTIP_HEIGHT = 24;

const highlight = (range: Range, highlightId: string) => {
  const {
    commonAncestorContainer,
    startContainer,
    startOffset,
    endContainer,
    endOffset,
  } = range.cloneRange();
  function surroundTextWithWrapper(
    startContainer: Node,
    startOffset: number,
    endContainer: Node,
    endOffset: number,
    highlightId: string,
  ) {
    const wrapper = document.createElement(HIGHLIGHT_TAGNAME);
    // HACK: couldn't figure out how to add global styles
    wrapper.style.backgroundColor = "#b2dbff";
    wrapper.style.cursor = "pointer";
    wrapper.style.userSelect = "none";
    wrapper.setAttribute(DATA_HIGHLIGHT_ID, highlightId);
    const customRange = document.createRange();
    customRange.setStart(startContainer, startOffset);
    customRange.setEnd(endContainer, endOffset);
    customRange.surroundContents(wrapper);
    window.getSelection()?.removeRange(customRange);
  }

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

export const getParentIdOrCreate = async (currentUrl: string) => {
  const noteContainer = await fetchNoteHighlightContainer();
  let parentId = "";
  if (noteContainer) {
    parentId = noteContainer.id;
  } else {
    parentId = crypto.randomUUID();

    const newNote: SerializedBlockNoteNode = {
      type: BLOCK_NOTE_TYPE,
      id: parentId,
      indexWithinParent: 0,
      version: 1,
      childBlocks: [],
      properties: null,
      children: [],
      direction: null,
      indent: 0,
      format: "",
      parentId: null,
      open: null,
      webUrl: currentUrl,
    };

    const newNoteUpdate = [
      {
        updateType: "created" as const,
        updatedBlockId: newNote.id,
        updatedBlock: newNote,
      },
    ];

    void postNote(newNoteUpdate);
  }

  return parentId;
};

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

const Highlight = () => {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    fetchNoteHighlightContainer().then(console.log).catch(console.error);
    fetchHighlights()
      .then((hls) => {
        console.log("fetchHighlights hls", hls);
        hls.forEach((hl) => {
          if (!hl.properties?.highlightPath) return;
          const range = deserializeSelectionPath(hl.properties.highlightPath);
          if (!range) return;
          highlight(range, hl.id);
        });
      })
      .catch(console.error);
    // return () => {};
  }, []);

  const handleMouseDown = () => {
    console.log("mousedown");
    setShowTooltip(false);
  };
  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (!selection) return;

    // All of this just to get the end position of the selection.
    const focusNode = selection.focusNode;
    const focusOffset = selection.focusOffset;
    if (!focusNode || !focusOffset) return;
    const span = document.createElement("span");
    const newRange = new Range();
    newRange.setStart(focusNode, focusOffset);
    newRange.insertNode(span);
    const selectionEndPosition = getOffsetRectRelativeToBody(span);
    focusNode.parentNode?.removeChild(span);
    focusNode.parentNode?.normalize();
    selection.removeRange(newRange);

    if (isAnchorBeforeFocus(selection)) {
      setTooltipPosition({
        x: selectionEndPosition.x - TOOLTIP_WIDTH / 2,
        y: selectionEndPosition.y + 1 * TOOLTIP_HEIGHT,
      });
    } else {
      setTooltipPosition({
        x: selectionEndPosition.x - TOOLTIP_WIDTH / 2,
        y: selectionEndPosition.y - 1.5 * TOOLTIP_HEIGHT,
      });
    }
  };
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    let isSelectionInsideMainContentArea = false;
    try {
      const range = selection.getRangeAt(0);
      isSelectionInsideMainContentArea =
        checkIfSelectionInsideMainContentArea(range);
    } catch (error) {
      console.log("error", error);
    }

    if (isSelectionInsideMainContentArea) {
      setShowTooltip(true);
    }
  };
  const handleHighlightClick = (event: MouseEvent) => {
    const targetEl = event.target;
    if (!targetEl) return;

    if (targetEl instanceof Element && targetEl.tagName === HIGHLIGHT_TAGNAME) {
      const highlightId = targetEl.getAttribute(DATA_HIGHLIGHT_ID);
      if (!highlightId) return;
      void (async function showHighlightDeleteBtn() {
        const highlights = await fetchHighlights();

        const clickedHighlight = highlights.find(
          (highlight) => highlight.id === highlightId,
        );

        if (!clickedHighlight) return;

        const selectedElem = document.querySelectorAll(
          `projectx-highlight[${DATA_HIGHLIGHT_ID}="${clickedHighlight.id}"]`,
        )[0];

        const position = selectedElem?.getBoundingClientRect();

        if (!position) return;

        // if (!deleteHighlightBtnRef.current) return;
        const highlightDeleteBtn = document.createElement(
          HIGHLIGHT_DELETE_TAGNAME,
        );
        highlightDeleteBtn.style.width = "18px";
        highlightDeleteBtn.style.height = "18px";
        highlightDeleteBtn.style.borderRadius = "10px";
        highlightDeleteBtn.style.position = "absolute";
        highlightDeleteBtn.style.top = "0px";
        highlightDeleteBtn.style.left = "0px";
        highlightDeleteBtn.style.cursor = "pointer";
        highlightDeleteBtn.style.border = "1px solid white";
        highlightDeleteBtn.style.background = "red";
        highlightDeleteBtn.style.color = "white";
        highlightDeleteBtn.style.transform = `translate(${position.left - 18}px, ${position.top - 18}px)`;
        highlightDeleteBtn.setAttribute(DATA_HIGHLIGHT_ID, highlightId);
        document.body.appendChild(highlightDeleteBtn);
      })();
    }

    if (
      targetEl instanceof Element &&
      targetEl.tagName === HIGHLIGHT_DELETE_TAGNAME
    ) {
      const highlightId = targetEl.getAttribute(DATA_HIGHLIGHT_ID);
      if (!highlightId) return;
      void (async function handleHighlightDelete() {
        if (!highlightId) return;
        const update: UpdatedBlock = {
          updateType: "destroyed",
          updatedBlockId: highlightId,
          updatedBlock: null,
        };
        console.log("update", update);

        void postHighlight([update]);

        const highlightElems = document.querySelectorAll(
          `projectx-highlight[${DATA_HIGHLIGHT_ID}="${highlightId}"]`,
        );

        highlightElems.forEach((element) => {
          const parent = element.parentNode;
          while (element.firstChild) {
            parent?.insertBefore(element.firstChild, element);
          }
          parent?.removeChild(element);
        });
      })();
      targetEl.remove();
    }

    const highlightDeleteBtn = document.querySelector(HIGHLIGHT_DELETE_TAGNAME);
    if (highlightDeleteBtn) {
      highlightDeleteBtn.remove();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("click", handleHighlightClick);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("click", handleHighlightClick);
    };
  }, [tooltipRef.current]);

  const handleTooltipClick = async () => {
    console.log("click tooltip");
    const selection = window.getSelection();
    if (!selection) return;

    const currentUrl = await getCurrentUrl();
    if (!currentUrl) return;

    const highlightId = crypto.randomUUID();
    const range = selection.getRangeAt(0);

    const {
      text: highlightText,
      path: highlightPath,
      rect: highlightRect,
    } = getSelectionParams(range);

    if (!highlightPath || !highlightText) return;

    const parentId = await getParentIdOrCreate(currentUrl);
    if (!parentId) return;

    const indexWithinParent = await getIndexWithinParent(highlightRect.y);

    // TODO: need to figure out ways to sync this data and BlockHighlightParagraph or easier way to create data
    const data: SerializedBlockHighlightNode = {
      type: BLOCK_HIGHLIGHT_TYPE,
      id: highlightId,
      parentId: parentId,
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
      },
    };

    console.log("data", data);

    const update = [
      {
        updateType: "created" as const,
        updatedBlockId: data.id,
        updatedBlock: data,
      },
    ];

    void postHighlight(update);

    highlight(range, data.id);
  };

  return (
    <>
      {showTooltip && (
        <div
          style={{
            width: "24px",
            height: "24px",
            border: "1px solid #333",
            padding: "3px",
            borderRadius: "4px",
            backgroundColor: "white",
            position: "absolute",
            top: "0px",
            left: "0px",
            cursor: "pointer",
            transform: `translate(${tooltipPosition.x}px, ${tooltipPosition.y}px)`,
          }}
          onMouseDown={handleTooltipClick}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        </div>
      )}
      {/* <button onClick={() => console.log("lastSelection", lastSelection)}>
        Test selection
      </button> */}
    </>
  );
};
export default Highlight;
