/* eslint-disable @typescript-eslint/no-floating-promises */
import { type PlasmoCSConfig } from "plasmo";
import { fetchHighlightsFromServer } from "~/background/messages/fetchHighlightsFromServer";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { deserializeSelectionPath } from "~/utils/extension";
import { highlight } from "./highlight";
console.log("highlightInit");

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_idle",
};

(async () => {
  const currentUrl = await getCurrentUrl();

  if (!currentUrl) return;
  const highlights = await fetchHighlightsFromServer({ url: currentUrl ?? "" });
  setTimeout(() => {
    // TODO: figure out better solution.
    // We need to show highlights only after the page is fully loaded. run_at: "document_idle" doesn't do the job
    // This only doesn't work on certain cites. e.g. https://docs.plasmo.com
    const transformed = highlights.map((hc) => {
      if (!hc.highlightRangePath) return;
      const range = deserializeSelectionPath(hc.highlightRangePath);
      if (!range) return;
      const {
        startContainer,
        startOffset,
        endContainer,
        endOffset,
        commonAncestorContainer,
      } = range;

      return {
        container: commonAncestorContainer,
        startContainer,
        startOffset,
        endContainer,
        endOffset,
        highlightId: hc.id,
      };
    });

    transformed.forEach((data) => {
      if (!data) return;

      const {
        container,
        startContainer,
        startOffset,
        endContainer,
        endOffset,
        highlightId,
      } = data;

      highlight({
        container,
        startContainer,
        startOffset,
        endContainer,
        endOffset,
        highlightId,
      });
    });
  }, 500);
})();
