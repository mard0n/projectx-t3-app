/* eslint-disable @typescript-eslint/no-floating-promises */
import { type PlasmoCSConfig } from "plasmo";
import { fetchHighlightsFromServer } from "~/background/messages/fetchHighlightsFromServer";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { getTimelineInSeconds, placeMarkers } from "~/utils/extension/youtube";
import { YT_FULL_LENGTH_TIME, YT_PROGRESS_BAR } from "./youtubeControl";

export const config: PlasmoCSConfig = {
  matches: ["https://*.youtube.com/*", "http://localhost:5500/*"],
  all_frames: true,
  run_at: "document_idle",
};

console.log("youtubeInit");
setTimeout(() => {
  (async () => {
    const currentUrl = await getCurrentUrl();
    console.log("currentUrl", currentUrl);
    if (!currentUrl) return;
    const highlights = await fetchHighlightsFromServer({
      url: currentUrl ?? "",
    });

    highlights.forEach((marker) => {
      const timeRegex = /(?:[?&](?:start|t)=(\d+))/;
      let markedTime = 0;

      const match = marker.highlightText?.match(timeRegex);

      if (match?.[1]) {
        markedTime = parseInt(match[1], 10);
      } else {
      }

      const ytProgressBar = document.querySelector(YT_PROGRESS_BAR);
      if (!ytProgressBar) return;

      const fullVideoLengthTimeStr =
        document.querySelector<HTMLElement>(YT_FULL_LENGTH_TIME);
      if (!fullVideoLengthTimeStr) return;

      const fullVideoLength = getTimelineInSeconds(
        fullVideoLengthTimeStr.innerText,
      );
      if (!fullVideoLength) return;

      placeMarkers(ytProgressBar, markedTime, fullVideoLength);
    });
  })();
}, 500);
