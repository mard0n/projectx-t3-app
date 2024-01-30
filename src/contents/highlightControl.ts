/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  getSelectedTextPosition,
  highlight,
  isAnchorBeforeFocus,
  serializeSelectionPath,
} from "~/utils/extension";
import type { PlasmoCSConfig } from "plasmo";
import TurndownService from "turndown";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { saveCommentHighlightsToStorage } from "~/utils/extension-store";
import {
  BLOCK_HIGHLIGHT_SLICE_TYPE,
  type SerializedBlockHighlightSliceNode,
} from "~/nodes/BlockHighlightSlice";
import { saveHighlight } from "~/background/messages/saveHighlight";
import type { RouterInputs } from "~/utils/api";

console.log(
  "You may find that having is not so pleasing a thing as wanting. This is not logical, but it is often true.",
);

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  exclude_matches: ["https://github.com/*"],
  all_frames: true,
  run_at: "document_idle",
};

const TOOLTIP_WIDTH = 32;
const TOOLTIP_HEIGHT = 32;
const TOOLTIP_ID = "projectx-tooltip";
// This was the easiest way to store the range
// I could serialize and store the range in chrome.storage but it might be too slow and requires lot of effort
let lastRange: Range | null = null;

async function handleTooltipClick() {
  const range = lastRange?.cloneRange();
  if (!range) return;

  const { startContainer, startOffset, endContainer, endOffset } = range;
  const selectionPath = serializeSelectionPath(
    startContainer,
    startOffset,
    endContainer,
    endOffset,
  );

  const turndownService = new TurndownService();
  const html = range.cloneContents();
  const markdown = turndownService.turndown(html);

  const currentUrl = await getCurrentUrl();

  // TODO: need to figure out ways to sync this data and BlockHighlightParagraph or easier way to create data
  const data: SerializedBlockHighlightSliceNode = {
    type: BLOCK_HIGHLIGHT_SLICE_TYPE,
    id: crypto.randomUUID(),
    title: "",
    parentId: null,
    indexWithinParent: 0,
    // indexWithinParent: this.getIndexWithinParent(),
    open: true,
    version: 1,
    children: [],
    direction: "ltr",
    format: "left",
    indent: 0,
    childNotes: [],
    highlightText: markdown,
    highlightUrl: currentUrl!,
    highlightRangePath: selectionPath,
  };

  saveCommentHighlightsToStorage(data);

  const update: RouterInputs["note"]["saveChanges"] = [
    {
      updateType: "created",
      updatedBlockId: data.id,
      updatedBlock: data,
    },
  ];

  saveHighlight(update);

  highlight(range);
}

// selectionchange didn't work because when you click on tooltip
// and hold your click selectionchange was firing and hidingTooltip before it's able to handle the click event
document.addEventListener("mousedown", (event) => {
  const isTooltipClicked = getTooltipElem()?.contains(event.target as Node);
  if (isTooltipClicked) {
    handleTooltipClick();
  }

  hideTooltip();
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
