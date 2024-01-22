import React, { type FC } from "react";
import type {
  PlasmoCSConfig,
  PlasmoCSUIJSXContainer,
  PlasmoCSUIProps,
  PlasmoRender,
} from "plasmo";
import { createRoot } from "react-dom/client";

console.log(
  "You may find that having is not so pleasing a thing as wanting. This is not logical, but it is often true.",
);

const TOOLTIP_WIDTH = 32;
const TOOLTIP_HEIGHT = 32;
const TOOLTIP_ID = "projectx-tooltip";

// selectionchange didn't work because when you click on tooltip
// and hold your click selectionchange was firing and hidingTooltip before it's able to handle the click event
document.addEventListener("mousedown", (event) => {
  const isTooltipClicked = getTooltipElem()?.contains(event.target as Node);

  if (!isHighlighting() || !isTooltipClicked) {
    hideTooltip();
  }
});

document.addEventListener("mouseup", (event: MouseEvent) => {
  console.log("mouseup event", event);
  if (isHighlighting()) {
    showTooltip();
  }
});

function getSelectedTextPosition(selection: Selection) {
  let selectionStartCoords: DOMRect | null = null,
    selectionEndCoords: DOMRect | null = null;
  if (selection?.rangeCount && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0).cloneRange();

    // Create span elements
    const startSpan = document.createElement("span");
    const endSpan = document.createElement("span");

    // Insert the spans before and after the selection
    const startRange = range.cloneRange();
    startRange.setStart(range.startContainer, range.startOffset);
    startRange.collapse(true);
    startRange.insertNode(startSpan);
    selectionStartCoords = getOffsetRectRelativeToBody(startSpan);
    const startSpanParent = startSpan.parentNode;
    if (!startSpanParent) return;
    startSpanParent.removeChild(startSpan);
    startSpanParent.normalize();
    selection.removeRange(startRange);

    const endRange = range.cloneRange();
    endRange.setStart(range.endContainer, range.endOffset);
    endRange.collapse(true);
    endRange.insertNode(endSpan);
    selectionEndCoords = getOffsetRectRelativeToBody(endSpan);
    const endSpanParent = endSpan.parentNode;
    if (!endSpanParent) return;
    endSpanParent.removeChild(endSpan);
    endSpanParent.normalize();
    selection.removeRange(endRange);

    // Set the selection back to the original positions

    selection.setBaseAndExtent(
      selection.anchorNode!,
      selection.anchorOffset,
      selection.focusNode!,
      selection.focusOffset,
    );
  }

  if (!selectionStartCoords || !selectionEndCoords) return;

  return {
    left: selectionStartCoords.left,
    right: selectionEndCoords.right,
    top: selectionStartCoords.top,
    bottom: selectionEndCoords.bottom,
  };
}

function isAnchorBeforeFocus(selection: Selection) {
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

function getOffsetRectRelativeToBody(el: HTMLElement): DOMRect {
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

function isHighlighting() {
  return window.getSelection && window.getSelection()?.type === "Range";
}

function getTooltipElem() {
  return document.getElementById(TOOLTIP_ID);
}

function showTooltip() {
  console.log("showTooltip");

  const tooltip = getTooltipElem();
  if (!tooltip) return;

  const selection = window.getSelection();
  if (!selection) return;

  const position = getSelectedTextPosition(selection);
  if (!position) return;

  if (isAnchorBeforeFocus(selection)) {
    tooltip.style.transform = `translate(${position.right + 4}px, ${
      position.bottom + 4
    }px)`;
  } else {
    tooltip.style.transform = `translate(${
      position.left - TOOLTIP_WIDTH - 4
    }px, ${position.top - TOOLTIP_HEIGHT - 4}px)`;
  }
  tooltip.style.display = "block";
}

function hideTooltip() {
  const tooltip = getTooltipElem();
  if (tooltip) tooltip.style.display = "none";
}

export const config: PlasmoCSConfig = {
  matches: ["https://*/*"],
};

export const getRootContainer = () =>
  new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const rootContainerParent = document.body;
      if (rootContainerParent) {
        clearInterval(checkInterval);
        const rootContainer = document.createElement("div");
        rootContainerParent.appendChild(rootContainer);
        resolve(rootContainer);
      }
    }, 137);
  });

const Tooltip: FC<PlasmoCSUIProps> = () => {
  const handleTooltipClick = () => {
    console.log("handleTooltipClick event");
    if (!isHighlighting()) {
      hideTooltip();
    }
  };

  return (
    <div
      id={TOOLTIP_ID}
      style={{
        width: TOOLTIP_WIDTH,
        height: TOOLTIP_HEIGHT,
        borderRadius: "4px",
        border: "1px solid #333",
        backgroundColor: "white",
        cursor: "pointer",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 100000,
        transformOrigin: "top left",
        display: "none",
      }}
      onClick={handleTooltipClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1"
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 9h16.5m-16.5 6.75h16.5"
        />
      </svg>
    </div>
  );
};

export const render: PlasmoRender<PlasmoCSUIJSXContainer> = async ({
  createRootContainer,
}) => {
  const rootContainer = await createRootContainer!();
  const root = createRoot(rootContainer);
  root.render(<Tooltip />);
};

export default Tooltip;
