import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo";
import { useEffect } from "react";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { getTabTitle } from "~/background/messages/getTabTitle";
import { sendHighlightToServer } from "~/background/messages/sendHighlightToServer";
import {
  BLOCK_HIGHLIGHT_TYPE,
  type SerializedBlockHighlightNode,
} from "~/nodes/BlockHighlight";
import { type RouterInputs } from "~/utils/api";
import { getTimelineInSeconds, placeMarkers } from "~/utils/extension/youtube";

export const config: PlasmoCSConfig = {
  matches: ["https://*.youtube.com/*", "http://localhost:5500/*"],
  all_frames: true,
  run_at: "document_idle",
};

export const YT_CONTROLS =
  "#movie_player .ytp-chrome-bottom .ytp-chrome-controls .ytp-left-controls";
export const YT_CHAPTER_CONTAINER =
  "#movie_player .ytp-chrome-bottom .ytp-chrome-controls .ytp-left-controls .ytp-chapter-container";
export const YT_PROGRESS_BAR =
  "#movie_player .ytp-chrome-bottom .ytp-progress-bar-container .ytp-progress-bar";
export const YT_FULL_LENGTH_TIME =
  "#movie_player .ytp-chrome-bottom .ytp-chrome-controls .ytp-time-duration";
export const YT_CURRENT_TIME =
  "#movie_player .ytp-chrome-bottom .ytp-chrome-controls .ytp-time-duration";

export const getInlineAnchor: PlasmoGetInlineAnchor = async () =>
  document.querySelector(YT_CONTROLS + " > div:last-of-type")!;

// Use this to optimize unmount lookups
export const getShadowHostId = () => "projectx-marker";

const Marker = () => {
  useEffect(() => {
    // TODO Find a better way to add styles to a page. getStyles not working
    document
      .querySelectorAll(YT_CHAPTER_CONTAINER)
      .forEach((node) => ((node as HTMLElement).style.flex = "none"));
  }, []);

  const handleMarkerClick = async () => {
    console.log("marked");
    // TODO extract timestamp and title
    const currentTime =
      document.querySelector<HTMLElement>(YT_CURRENT_TIME)?.innerText;
    if (!currentTime) return;

    const markedTime = getTimelineInSeconds(currentTime);
    if (!markedTime) return;

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

    const currentUrl = await getCurrentUrl();
    const tabTitle = await getTabTitle();

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
      direction: null,
      format: "",
      indent: 0,
      childBlocks: [],
      highlightText: `[${tabTitle}](${currentUrl}&t=${markedTime}s)`,
      highlightUrl: currentUrl!,
      highlightRangePath: "",
    };

    const update: RouterInputs["note"]["saveChanges"] = [
      {
        updateType: "created",
        updatedBlockId: data.id,
        updatedBlock: data,
      },
    ];

    await sendHighlightToServer(update);
    // TODO LATER capture the picture as well
    // TODO shortcut
    // TODO add tooltip
    // TODO LATER How to delete markers. We gonna have saved content in the website
  };
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginLeft: 12,
        cursor: "pointer",
      }}
      onClick={handleMarkerClick}
    >
      <svg
        width="16"
        height="12"
        viewBox="0 0 16 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 0.352538L16 0.352539L8 11.6467L0 0.352538Z"
          fill="#E6E6E6"
        />
      </svg>
      Mark
    </div>
  );
};

export default Marker;
