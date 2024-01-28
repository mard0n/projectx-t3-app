console.log("highlight.js loaded");

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
  const startParentNode = document.querySelector(startPath!);
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
