/* eslint-disable @typescript-eslint/no-floating-promises */
import { Storage } from "@plasmohq/storage";
import { type PlasmoCSConfig } from "plasmo";
import { type SerializedBlockHighlightParagraphNode } from "~/nodes/BlockHighlightParagraph";
import { deserializeSelectionPath, highlight } from "~/utils/extension";
console.log("highlightInit");

const storage = new Storage({ area: "local" });

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_idle",
};

(async () => {
  const highlightComments: SerializedBlockHighlightParagraphNode[] =
    (await storage.get("saveHightlightComment")) ?? [];
  setTimeout(() => {
    // TODO: figure out better solution.
    // We need to show highlights only after the page is fully loaded. run_at: "document_idle" doesn't do the job
    // This only doesn't work on certain cites. e.g. https://docs.plasmo.com
    highlightComments.forEach((hc) => {
      const range = deserializeSelectionPath(hc.highlightRangePath);
      if (!range) return;
      highlight(range);
    });
  }, 500);
})();
