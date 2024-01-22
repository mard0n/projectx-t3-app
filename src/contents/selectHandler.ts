export {};
console.log(
  "You may find that having is not so pleasing a thing as wanting. This is not logical, but it is often true.",
);

let tooltipElem: HTMLDivElement | null = null;
document.addEventListener("selectionchange", (event) => {
  console.log("selectionchange");
  if (!window?.getSelection()?.toString()) {
    tooltipElem?.remove();
  }
});

document.addEventListener("mouseup", () => {
  console.log("mouseup");
  tooltipElem?.remove();

  const selection = window.getSelection();
  if (selection?.isCollapsed) return;

  const position = getSelectedTextPosition();
  if (!position) return;
  console.log("position", position);

  if (isAnchorBeforeFocus()) {
    createTooltip({ left: position.right, top: position.bottom });
  } else {
    createTooltip({ left: position.left - 64, top: position.top - 24 });
  }
});

function getSelectedTextPosition() {
  let selectionStartCoords: DOMRect | null = null,
    selectionEndCoords: DOMRect | null = null;
  const selection = window.getSelection();
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
    selectionStartCoords = getOffsetRect(startSpan);
    const startSpanParent = startSpan.parentNode;
    if (!startSpanParent) return;
    startSpanParent.removeChild(startSpan);
    startSpanParent.normalize();
    selection.removeRange(startRange);

    const endRange = range.cloneRange();
    endRange.setStart(range.endContainer, range.endOffset);
    endRange.collapse(true);
    endRange.insertNode(endSpan);
    selectionEndCoords = getOffsetRect(endSpan);
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

function createTooltip(position: { left: number; top: number }) {
  tooltipElem = document.createElement("div");
  tooltipElem.innerText = "highlight";
  tooltipElem.style.position = "absolute";
  tooltipElem.style.zIndex = "100000";
  tooltipElem.style.transform = `translate(${position.left}px, ${position.top}px)`;
  tooltipElem.style.transformOrigin = "top left";
  document.body.insertBefore(tooltipElem, document.body.firstChild);
}

function isAnchorBeforeFocus() {
  const selection = window.getSelection();
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

// BoundingClientRect relative to the document
const getOffsetRect = (el: HTMLElement): DOMRect => {
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
};
