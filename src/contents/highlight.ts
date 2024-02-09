import { fetchHighlightsFromServer } from "~/background/messages/fetchHighlightsFromServer";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { showDeleteHighlightElem } from "./highlightControl";

async function handleSelectedTextClick(highlightId: string) {
  const currentUrl = await getCurrentUrl();

  if (!currentUrl) return;

  const highlights = await fetchHighlightsFromServer({ url: currentUrl });

  const clickedHighlight = highlights.find(
    (highlight) => highlight.id === highlightId,
  );

  if (!clickedHighlight) return;

  const selectedElem = document.querySelectorAll(
    `projectx-highlight[data-highlight-id="${clickedHighlight.id}"]`,
  )[0];

  const position = selectedElem?.getBoundingClientRect();

  if (!position) return;

  showDeleteHighlightElem(position, highlightId);
}

function surroundTextWithWrapper(
  startContainer: Node,
  startOffset: number,
  endContainer: Node,
  endOffset: number,
  highlightId: string,
) {
  const wrapper = document.createElement("projectx-highlight");
  // HACK: couldn't figure out how to add global styles
  wrapper.style.backgroundColor = "#b2dbff";
  wrapper.style.cursor = "pointer";
  wrapper.style.userSelect = "none";
  wrapper.setAttribute("data-highlight-id", highlightId);
  wrapper.addEventListener("click", (event) => {
    // TODO: find a better place to handle clicks
    console.log("event", event);
    const id = (event.target as HTMLElement).getAttribute("data-highlight-id");
    if (id) {
      handleSelectedTextClick(id).then(console.log).catch(console.error);
    }
  });
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

// TODO: Highlight fucks up the range. Place it on the bottom before any range dependent fns
export function highlight({
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
}) {
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
}
