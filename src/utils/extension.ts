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

function surroundTextWithWrapper(
  range: Range,
  startContainer: Node,
  startOffset: number,
  endContainer: Node,
  endOffset: number,
) {
  const wrapper = document.createElement("projectx-highlight");
  // HACK: couldn't figure out how to add global styles
  wrapper.style.backgroundColor = "#b2dbff";
  const customRange = range.cloneRange();
  customRange.setStart(startContainer, startOffset);
  customRange.setEnd(endContainer, endOffset);
  customRange.surroundContents(wrapper);
  window.getSelection()?.removeRange(customRange);
}

// TODO: Highlight fucks up the range. Place it on the bottom before any range dependent fns
export function highlight(range: Range) {
  const rangeClone = range.cloneRange();
  const container = rangeClone.commonAncestorContainer;
  const startContainer = rangeClone.startContainer as Node | Text;
  const startOffset = rangeClone.startOffset;
  const endContainer = rangeClone.endContainer;
  const endOffset = rangeClone.endOffset;

  let currentNode: Node | Text | null = startContainer;

  if (currentNode === startContainer && currentNode === endContainer) {
    surroundTextWithWrapper(
      rangeClone,
      startContainer,
      startOffset,
      endContainer,
      endOffset,
    );
    return;
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
        rangeClone,
        startContainer,
        startOffset,
        startContainer,
        (startContainer as Text).length,
      );
      currentNode = nextNodeBeforeWrapperApplied;
      continue;
    }

    if (textNode === endContainer) {
      surroundTextWithWrapper(
        rangeClone,
        endContainer,
        0,
        endContainer,
        endOffset,
      );
      break;
    }

    surroundTextWithWrapper(rangeClone, textNode, 0, textNode, textNode.length);
    currentNode = nextNodeBeforeWrapperApplied;
  }
}

function getSelectionPath(el: Node) {
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

export function serializeSelectionPath(
  startContainer: Node,
  startOffset: number,
  endContainer: Node,
  endOffset: number,
): string {
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

export function getSelectedTextPosition(selection: Selection) {
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
