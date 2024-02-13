/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  getSelectedTextPosition,
  isAnchorBeforeFocus,
  serializeSelectionPath,
} from "~/utils/extension";
import type { PlasmoCSConfig } from "plasmo";
import TurndownService from "turndown";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import {
  BLOCK_HIGHLIGHT_TYPE,
  type SerializedBlockHighlightNode,
} from "~/nodes/BlockHighlight";
import { sendHighlightToServer } from "~/background/messages/sendHighlightToServer";
import type { RouterInputs } from "~/utils/api";
import { highlight } from "./highlight";
import type { UpdatedBlock } from "~/plugins/SendingUpdatesPlugin";

console.log(
  "You may find that having is not so pleasing a thing as wanting. This is not logical, but it is often true.",
);

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  exclude_matches: ["https://github.com/*", "https://*.youtube.com/*"],
  all_frames: true,
  run_at: "document_idle",
};

const TOOLTIP_WIDTH = 32;
const TOOLTIP_HEIGHT = 32;
const TOOLTIP_ID = "projectx-tooltip";
const DELETE_HIGHLIGHT_ID = "projectx-delete-highlight-btn";
// This was the easiest way to store the range
// I could serialize and store the range in chrome.storage but it might be too slow and requires lot of effort
let lastRange: Range | null = null;

async function handleTooltipClick() {
  const range = lastRange?.cloneRange();
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

  sendHighlightToServer(update);

  highlight({
    container: commonAncestorContainer,
    startContainer,
    startOffset,
    endContainer,
    endOffset,
    highlightId: data.id,
  });
}

async function handleHighlightDelete(highlightId: string) {
  const update: UpdatedBlock = {
    updateType: "destroyed",
    updatedBlockId: highlightId,
    updatedBlock: null,
  };

  sendHighlightToServer([update]);

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

  hideDeleteHighlightElem();
}

// selectionchange didn't work because when you click on tooltip
// and hold your click selectionchange was firing and hidingTooltip before it's able to handle the click event
document.addEventListener("mousedown", (event) => {
  hideTooltip();
  // hideDeleteHighlightElem();
});

document.addEventListener("selectionchange", () => {
  const range = window.getSelection()?.getRangeAt(0).cloneRange();
  if (range) {
    lastRange = range;
  }
});

document.addEventListener("mouseup", () => {
  if (isHighlighting()) {
    showTooltip();
  }
});

function isHighlighting() {
  return window.getSelection && window.getSelection()?.type === "Range";
}

function getTooltipElem() {
  return document.getElementById(TOOLTIP_ID);
}

function showTooltip() {
  const tooltip = getTooltipElem();
  if (!tooltip) return;

  const selection = window.getSelection();
  if (!selection) return;

  const position = getSelectedTextPosition(selection);
  console.log("position", position);

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
  tooltip.style.visibility = "visible";
}

function hideTooltip() {
  const tooltip = getTooltipElem();
  if (tooltip) tooltip.style.visibility = "hidden";
}

function getDeleteHighlightElem() {
  return document.getElementById(DELETE_HIGHLIGHT_ID);
}

export function showDeleteHighlightElem(
  { top, left }: DOMRect,
  highlightId: string,
) {
  const deleteHighlightBtn = getDeleteHighlightElem();
  if (!deleteHighlightBtn) return;

  if (!top || !left) return;
  deleteHighlightBtn.style.transform = `translate(${left - 24}px, ${top}px)`;

  deleteHighlightBtn.style.visibility = "visible";
  deleteHighlightBtn.setAttribute("data-highlight-id", highlightId);
  return deleteHighlightBtn;
}

export function hideDeleteHighlightElem() {
  const deleteHighlightBtn = getDeleteHighlightElem();
  if (deleteHighlightBtn) deleteHighlightBtn.style.visibility = "hidden";
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

  tooltipElem.addEventListener("mousedown", () => {
    handleTooltipClick();
  });
  document.body.appendChild(tooltipElem);
}
function renderHighlightDeleteBtnOnLoad() {
  const deleteHighlightBtn = document.createElement("div");
  deleteHighlightBtn.setAttribute("id", DELETE_HIGHLIGHT_ID);
  deleteHighlightBtn.style.width = "24px";
  deleteHighlightBtn.style.height = "24px";
  deleteHighlightBtn.style.borderRadius = "100px";
  deleteHighlightBtn.style.backgroundColor = "red";
  deleteHighlightBtn.style.position = "absolute";
  deleteHighlightBtn.style.top = "0px";
  deleteHighlightBtn.style.left = "0px";
  deleteHighlightBtn.style.cursor = "pointer";
  deleteHighlightBtn.style.visibility = "hidden";

  deleteHighlightBtn.addEventListener("mousedown", (event) => {
    const target = event.target as HTMLElement | null;

    if (!target) return;
    const highlightId = target.getAttribute("data-highlight-id");

    if (!highlightId) return;
    handleHighlightDelete(highlightId);
  });
  document.body.appendChild(deleteHighlightBtn);
}
renderTooltipOnLoad();
renderHighlightDeleteBtnOnLoad();

/*
  React tooltip component didn't work because we need to capture selection before it's changed (i.e. on mousedown)
  not when tooltip is clicked. Cuz by the time the tooltip is clicked the selection is already gone.
*/
