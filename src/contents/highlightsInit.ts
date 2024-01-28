/* eslint-disable @typescript-eslint/no-floating-promises */
import { type PlasmoCSConfig } from "plasmo";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { deserializeSelectionPath, highlight } from "~/utils/extension";
import { getCommentHighlights } from "~/utils/extension-store";
console.log("highlightInit");

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_idle",
};

(async () => {
  const highlightComments = await getCommentHighlights();

  const currentUrl = await getCurrentUrl();

  setTimeout(() => {
    // TODO: figure out better solution.
    // We need to show highlights only after the page is fully loaded. run_at: "document_idle" doesn't do the job
    // This only doesn't work on certain cites. e.g. https://docs.plasmo.com
    highlightComments
      .filter((highlight) => {
        return highlight.highlightUrl === currentUrl;
      })
      .forEach((hc) => {
        const range = deserializeSelectionPath(hc.highlightRangePath);
        if (!range) return;
        highlight(range);
      });
  }, 500);
})();
