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
  wrapper.style.backgroundColor = '#b2dbff'
  const customRange = range.cloneRange();
  customRange.setStart(startContainer, startOffset);
  customRange.setEnd(endContainer, endOffset);
  customRange.surroundContents(wrapper);
  window.getSelection()?.removeRange(customRange);
}

export function highlight(range: Range) {
  const container = range.commonAncestorContainer;
  const startContainer = range.startContainer as Node | Text;
  const startOffset = range.startOffset;
  const endContainer = range.endContainer;
  const endOffset = range.endOffset;

  let currentNode: Node | Text | null = startContainer;

  if (currentNode === startContainer && currentNode === endContainer) {
    surroundTextWithWrapper(
      range,
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
        range,
        startContainer,
        startOffset,
        startContainer,
        (startContainer as Text).length,
      );
      currentNode = nextNodeBeforeWrapperApplied;
      continue;
    }

    if (textNode === endContainer) {
      surroundTextWithWrapper(range, endContainer, 0, endContainer, endOffset);
      break;
    }

    surroundTextWithWrapper(range, textNode, 0, textNode, textNode.length);
    currentNode = nextNodeBeforeWrapperApplied;
  }
}
