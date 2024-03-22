import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { getTabTitle } from "~/background/messages/getTabTitle";
import {
  BLOCK_LINK_TYPE,
  type SerializedBlockLinkNode,
} from "~/nodes/BlockLink";

export const MARKER_ATTRIBUTE_NAME = "data-marker-id";

export const YT_CONTROLS =
  "#movie_player .ytp-chrome-bottom .ytp-chrome-controls .ytp-left-controls";
export const YT_CHAPTER_CONTAINER =
  "#movie_player .ytp-chrome-bottom .ytp-chrome-controls .ytp-left-controls .ytp-chapter-container";
export const YT_PROGRESS_BAR =
  "#movie_player .ytp-chrome-bottom .ytp-progress-bar-container .ytp-progress-bar";
export const YT_FULL_LENGTH_TIME =
  "#movie_player .ytp-chrome-bottom .ytp-chrome-controls .ytp-time-duration";
export const YT_CURRENT_TIME =
  "#movie_player .ytp-chrome-bottom .ytp-chrome-controls .ytp-time-current";

export const getTimelineInSeconds = (timeline: string) => {
  const parts = timeline?.split(":");

  if (!parts) return;

  let hour, minute, second;
  let timeInSeconds = 0;

  if (parts.length === 2) {
    // Format is "mm:ss" (minutes:seconds)
    hour = "00";
    [minute, second] = parts;
    timeInSeconds = timeInSeconds + (minute ? parseInt(minute, 10) * 60 : 0);
    timeInSeconds = timeInSeconds + (second ? parseInt(second, 10) : 0);
  } else if (parts.length === 3) {
    // Format is "hh:mm:ss" (hours:minutes:seconds)
    [hour, minute, second] = parts;
    timeInSeconds = timeInSeconds + (hour ? parseInt(hour, 10) * 60 * 60 : 0);
    timeInSeconds = timeInSeconds + (minute ? parseInt(minute, 10) * 60 : 0);
    timeInSeconds = timeInSeconds + (second ? parseInt(second, 10) : 0);
  } else {
    // Invalid time format
    console.error("Invalid time format:", timeline);
  }

  return timeInSeconds;
};

export const isLinkYoutube = (link: string) => {
  const youtubeRegExp =
    /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  return !!link.match(youtubeRegExp);
};

export const extractTimeFromYoutubeLink = (link: string) => {
  const urlObj = new URLSearchParams(link);
  const timeStr = urlObj.get("t");
  if (timeStr == null) return null;

  return Number(parseInt(timeStr));
};

export const getVideoDurationInSec = () => {
  const fullVideoLengthTimeStr =
    document.querySelector<HTMLElement>(YT_FULL_LENGTH_TIME)?.innerText;
  if (!fullVideoLengthTimeStr) return null;

  const fullVideoLength = getTimelineInSeconds(fullVideoLengthTimeStr);
  if (!fullVideoLength) return null;

  return fullVideoLength;
};

export const getMarkerPosition = (currentTime: number) => {
  const fullVideoLength = getVideoDurationInSec();
  const ytProgressBar = document.querySelector(YT_PROGRESS_BAR);
  if (!ytProgressBar || !currentTime || !fullVideoLength) return null;
  const barWidth = ytProgressBar.clientWidth;
  const markerPosition = (currentTime / fullVideoLength) * barWidth;
  return markerPosition;
};

export const getCurrentProgressInSec = () => {
  const currentTimeStr =
    document.querySelector<HTMLElement>(YT_CURRENT_TIME)?.innerText;
  if (!currentTimeStr) return null;

  const currentTime = getTimelineInSeconds(currentTimeStr);
  if (!currentTime) return null;
  return currentTime;
};

export const getActiveMarker = async (markers: SerializedBlockLinkNode[]) => {
  const currentProgressInSec = getCurrentProgressInSec();
  if (!currentProgressInSec) return;
  // TODO Are you sure about using left as a indicator of marker position. Maybe to use the seconds from the link
  const activeMarker = markers.find((marker) => {
    if (!marker.properties.linkUrl) return false;

    const markerTime = extractTimeFromYoutubeLink(marker.properties.linkUrl);
    if (!markerTime) return false;

    return (
      markerTime - 5 <= currentProgressInSec &&
      currentProgressInSec <= markerTime + 5
    );
  });
  return activeMarker;
};

export const createYoutubeMarkData = async () => {
  const currentTime = getCurrentProgressInSec();
  const currentUrl = await getCurrentUrl();
  const tabTitle = await getTabTitle();

  if (!currentUrl || !tabTitle || !currentTime) return;

  const newYoutubeHighlight: SerializedBlockLinkNode = {
    type: BLOCK_LINK_TYPE,
    id: crypto.randomUUID(),
    parentId: null,
    indexWithinParent: 0,
    open: true,
    version: 1,
    webUrl: currentUrl, // TO get the time/position
    properties: {
      linkType: "block-link-youtube",
      title: tabTitle,
      linkUrl: `${currentUrl}&t=${currentTime}s`,
      linkAlt: currentTime + " - chapter name",
      // thumbnail: "",
    },
    childBlocks: [],
    children: [],
    direction: null,
    format: "",
    indent: 0,
  };
  return newYoutubeHighlight;
};
