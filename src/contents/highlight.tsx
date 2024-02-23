import { type PlasmoCSConfig } from "plasmo";
import { useEffect, useRef, useState } from "react";
import { fetchHighlightsFromServer } from "~/background/messages/fetchHighlightsFromServer";
import {
  deserializeSelectionPath,
  getSelectedTextPosition,
  isAnchorBeforeFocus,
  serializeSelectionPath,
} from "~/utils/extension";
import TurndownService from "turndown";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { sendHighlightToServer } from "~/background/messages/sendHighlightToServer";
import {
  type SerializedBlockHighlightNode,
  BLOCK_HIGHLIGHT_TYPE,
} from "~/nodes/BlockHighlight";
import { type RouterInputs } from "~/utils/api";
import { type UpdatedBlock } from "~/plugins/SendingUpdatesPlugin";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  exclude_matches: ["https://*.youtube.com/*"],
  all_frames: true,
  run_at: "document_idle",
};

const Highlight = () => {
  const lastRange = useRef<Range | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const deleteHighlightBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    fetchHighlightsFromServer()
      .then((hls) => {
        hls.forEach((hl) => {
          if (!hl.highlightRangePath) return;
          const range = deserializeSelectionPath(hl.highlightRangePath);
          if (!range) return;
          const {
            startContainer,
            startOffset,
            endContainer,
            endOffset,
            commonAncestorContainer,
          } = range;
          highlight({
            container: commonAncestorContainer,
            startContainer,
            startOffset,
            endContainer,
            endOffset,
            highlightId: hl.id,
          });
        });
      })
      .catch(console.error);
    // return () => {};
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", (event) => {
      if (!tooltipRef.current) return;
      tooltipRef.current.style.visibility = "hidden";
    });

    document.addEventListener("selectionchange", () => {
      const range = window.getSelection()?.getRangeAt(0).cloneRange();
      if (range) {
        lastRange.current = range;
      }
    });

    document.addEventListener("mouseup", () => {
      const isHighlighting =
        window.getSelection && window.getSelection()?.type === "Range";

      if (isHighlighting) {
        const selection = window.getSelection();
        if (!selection || !tooltipRef.current) return;

        const position = getSelectedTextPosition(selection);
        console.log("position", position);

        if (!position) return;

        if (isAnchorBeforeFocus(selection)) {
          tooltipRef.current.style.transform = `translate(${position.right + 4}px, ${
            position.bottom + 4
          }px)`;
        } else {
          tooltipRef.current.style.transform = `translate(${
            position.left - 24 - 4
          }px, ${position.top - 24 - 4}px)`;
        }
        tooltipRef.current.style.visibility = "visible";
      }
    });

    // return () => {};
  }, [tooltipRef.current]);

  const handleTooltipClick = async () => {
    const range = lastRange.current?.cloneRange();
    if (!range) return;

    const {
      startContainer,
      startOffset,
      endContainer,
      endOffset,
      commonAncestorContainer,
    } = range;

    const selectionPath = serializeSelectionPath({
      startContainer,
      startOffset,
      endContainer,
      endOffset,
    });

    const turndownService = new TurndownService();
    const html = range.cloneContents();
    const markdown = turndownService.turndown(html);

    const currentUrl = await getCurrentUrl();

    // TODO: need to figure out ways to sync this data and BlockHighlightParagraph or easier way to create data
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
      direction: "ltr",
      format: "left",
      indent: 0,
      childBlocks: [],
      highlightText: markdown,
      highlightUrl: currentUrl!,
      highlightRangePath: selectionPath,
    };

    const update: RouterInputs["note"]["saveChanges"] = [
      {
        updateType: "created",
        updatedBlockId: data.id,
        updatedBlock: data,
      },
    ];

    void sendHighlightToServer(update);

    highlight({
      container: commonAncestorContainer,
      startContainer,
      startOffset,
      endContainer,
      endOffset,
      highlightId: data.id,
    });
  };

  const handleHighlightDelete = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const highlightId = target.getAttribute("data-highlight-id");

    if (!highlightId) return;
    const update: UpdatedBlock = {
      updateType: "destroyed",
      updatedBlockId: highlightId,
      updatedBlock: null,
    };
    console.log("update", update);

    void sendHighlightToServer([update]);

    const highlightElems = document.querySelectorAll(
      `projectx-highlight[data-highlight-id="${highlightId}"]`,
    );

    highlightElems.forEach((element) => {
      const parent = element.parentNode;
      while (element.firstChild) {
        parent?.insertBefore(element.firstChild, element);
      }
      parent?.removeChild(element);
    });

    if (!deleteHighlightBtnRef.current) return;

    deleteHighlightBtnRef.current.style.visibility = "hidden";
  };

  const handleSelectedTextClick = async (highlightId: string) => {
    console.log("highlightId", highlightId);

    const highlights = await fetchHighlightsFromServer();

    const clickedHighlight = highlights.find(
      (highlight) => highlight.id === highlightId,
    );

    if (!clickedHighlight) return;

    const selectedElem = document.querySelectorAll(
      `projectx-highlight[data-highlight-id="${clickedHighlight.id}"]`,
    )[0];

    const position = selectedElem?.getBoundingClientRect();

    if (!position) return;

    if (!deleteHighlightBtnRef.current) return;

    deleteHighlightBtnRef.current.style.transform = `translate(${position.left - 24}px, ${position.top}px)`;

    deleteHighlightBtnRef.current.style.visibility = "visible";
    deleteHighlightBtnRef.current.setAttribute(
      "data-highlight-id",
      highlightId,
    );
  };

  const surroundTextWithWrapper = (
    startContainer: Node,
    startOffset: number,
    endContainer: Node,
    endOffset: number,
    highlightId: string,
  ) => {
    const wrapper = document.createElement("projectx-highlight");
    // HACK: couldn't figure out how to add global styles
    wrapper.style.backgroundColor = "#b2dbff";
    wrapper.style.cursor = "pointer";
    wrapper.style.userSelect = "none";
    wrapper.setAttribute("data-highlight-id", highlightId);
    wrapper.addEventListener("click", (event) => {
      // TODO: find a better place to handle clicks
      console.log("event", event);
      const id = (event.target as HTMLElement).getAttribute(
        "data-highlight-id",
      );
      if (id) {
        void handleSelectedTextClick(id);
      }
    });
    const customRange = document.createRange();
    customRange.setStart(startContainer, startOffset);
    customRange.setEnd(endContainer, endOffset);
    customRange.surroundContents(wrapper);
    window.getSelection()?.removeRange(customRange);
  };

  const highlight = ({
    container,
    startContainer,
    startOffset,
    endContainer,
    endOffset,
    highlightId,
  }: {
    container: Node;
    startContainer: Node | Text;
    startOffset: number;
    endContainer: Node;
    endOffset: number;
    highlightId: string;
  }) => {
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

    while (currentNode) {
      const nextNodeBeforeWrapperApplied = getNextNode(currentNode, container);

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

  return (
    <>
      <div
        ref={tooltipRef}
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
          visibility: "hidden",
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
      <button
        ref={deleteHighlightBtnRef}
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "100px",
          position: "absolute",
          top: "0px",
          left: "0px",
          cursor: "pointer",
          border: "1px solid white",
          background: "red",
          color: "white",
          padding: 0,
          visibility: "hidden",
        }}
        onMouseDown={handleHighlightDelete}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>
      </button>
    </>
  );
};
export default Highlight;
