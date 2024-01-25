import { highlight, serializeSelectionPath } from "~/utils/extension";
import type { PlasmoCSConfig } from "plasmo"

console.log(
  "You may find that having is not so pleasing a thing as wanting. This is not logical, but it is often true.",
);

 
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  exclude_matches: ["https://github.com/*"],
  all_frames: true
}

const TOOLTIP_WIDTH = 32;
const TOOLTIP_HEIGHT = 32;
const TOOLTIP_ID = "projectx-tooltip";
let latestRange: Range | null = null;

// selectionchange didn't work because when you click on tooltip
// and hold your click selectionchange was firing and hidingTooltip before it's able to handle the click event
document.addEventListener("mousedown", (event) => {
  const isTooltipClicked = getTooltipElem()?.contains(event.target as Node);

  if (isTooltipClicked && latestRange) {
    const { startContainer, startOffset, endContainer, endOffset } = latestRange
    const selectionPath = serializeSelectionPath(startContainer, startOffset, endContainer, endOffset)
    
    highlight(latestRange);
  }

  hideTooltip();
});

document.addEventListener("mouseup", (event: MouseEvent) => {
  console.log("mouseup event", event);
  console.log("isHighlighting()", isHighlighting());

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
  console.log('selection', selection);
  
  if (!selection) return;
  latestRange = selection.getRangeAt(0).cloneRange();

  const position = getSelectedTextPosition(selection);
  console.log('position', position);
  
  if (!position) return;

  console.log('isAnchorBeforeFocus(selection)', isAnchorBeforeFocus(selection));
  
  if (isAnchorBeforeFocus(selection)) {
    tooltip.style.transform = `translate(${position.right + 4}px, ${
      position.bottom + 4
    }px)`;
  } else {
    tooltip.style.transform = `translate(${
      position.left - TOOLTIP_WIDTH - 4
    }px, ${position.top - TOOLTIP_HEIGHT - 4}px)`;
  }
  tooltip.style.visibility = "visible";
}

function hideTooltip() {
  const tooltip = getTooltipElem();
  if (tooltip) tooltip.style.visibility = "hidden";
  latestRange = null;
}

function renderTooltipOnLoad() {
  console.log("rendered");
  const tooltipElem = document.createElement("div");
  tooltipElem.setAttribute("id", TOOLTIP_ID);
  tooltipElem.style.width = TOOLTIP_WIDTH + "px";
  tooltipElem.style.height = TOOLTIP_HEIGHT + "px";
  tooltipElem.style.border = "1px solid #333";
  tooltipElem.style.borderRadius = "4px";
  tooltipElem.style.backgroundColor = "white";
  tooltipElem.style.position = "absolute";
  tooltipElem.style.top = "0px";
  tooltipElem.style.left = "0px";
  tooltipElem.style.cursor = "pointer";
  tooltipElem.style.visibility = "hidden";

  document.body.appendChild(tooltipElem);
}
renderTooltipOnLoad();

/*
  React tooltip component didn't work because we need to capture selection before it's changed (i.e. on mousedown)
  not when tooltip is clicked. Cuz by the time the tooltip is clicked the selection is already gone.
*/
