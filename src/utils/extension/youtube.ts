import { fetchWebMetadata } from "~/background/messages/fetchWebMetadata";
import { fetchYoutube } from "~/background/messages/fetchYoutube";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { getTabData } from "~/background/messages/getTabTitle";
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
export const YT_CHAPTER_TITLE =
  "#movie_player .ytp-chrome-bottom .ytp-chrome-controls .ytp-chapter-title-content";

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

    const timelineLength = document.querySelector(YT_PROGRESS_BAR)?.clientWidth;
    const fullVideoDuration = getVideoDurationInSec();
    let gracePeriodSec = 5;
    if (timelineLength && fullVideoDuration) {
      gracePeriodSec = (fullVideoDuration * 8) / timelineLength;
    }

    return (
      markerTime - gracePeriodSec <= currentProgressInSec &&
      currentProgressInSec <= markerTime + gracePeriodSec
    );
  });
  return activeMarker;
};

export const captureCurrentYoutubeFrame = () => {
  return new Promise<Blob | undefined>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const video = document.querySelector("video");
    if (!video || !canvas) return;
    const context = canvas.getContext("2d");
    canvas.width = video.offsetWidth;
    canvas.height = video.offsetHeight;
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);
    // const cropped = canvas.toDataURL(`image/jpeg`);
    canvas.toBlob((image) => {
      if (image) {
        resolve(image);
      }
    });
  });
};

export function convertSecondstoTime(sec: number) {
  if (!sec) return;
  const dateObj = new Date(sec * 1000);
  const hours = dateObj.getUTCHours();
  const minutes = dateObj.getUTCMinutes();
  const seconds = dateObj.getSeconds();
  const hourStr = hours ? hours.toString().padStart(2, "0") + ":" : "";
  const minStr = minutes ? minutes.toString().padStart(2, "0") + ":" : "";
  const secStr = seconds ? seconds.toString().padStart(2, "0") : "";

  const timeString = hourStr + minStr + secStr;
  return timeString;
}

const getIndexWithinYoutubeMarkers = async (currentTime: number) => {
  const markers = await fetchYoutube();
  markers.sort((a, b) => a.indexWithinParent - b.indexWithinParent);

  const indexOfNextSibling =
    markers.find((m) => {
      const markTime = extractTimeFromYoutubeLink(m.properties.linkUrl);
      if (!markTime) return;
      return markTime >= currentTime;
    })?.indexWithinParent ?? 0;

  const indexWithinParent = indexOfNextSibling + 0.001; // TODO: Find a better way to sort
  return indexWithinParent;
};

export const createYoutubeMarkData = async () => {
  const currentTime = getCurrentProgressInSec();
  const currentUrl = await getCurrentUrl();
  const tabData = await getTabData();
  if (!currentUrl || !tabData.title || !currentTime) return;
  const chapterText = document.querySelector(YT_CHAPTER_TITLE)?.textContent;

  const linkUrl = `${currentUrl}&t=${currentTime}s`;
  const linkAlt =
    chapterText && currentTime
      ? `${convertSecondstoTime(currentTime)} - ${chapterText}`
      : linkUrl;

  const webMetadata = await fetchWebMetadata();
  if (!webMetadata) return;

  const indexWithinParent = await getIndexWithinYoutubeMarkers(currentTime);

  const newYoutubeHighlight: SerializedBlockLinkNode = {
    type: BLOCK_LINK_TYPE,
    id: crypto.randomUUID(),
    parentId: webMetadata.defaultNoteId,
    indexWithinParent: indexWithinParent,
    open: true,
    version: 1,
    webUrl: currentUrl,
    properties: {
      linkType: "block-link-youtube",
      title: tabData.title,
      desc: tabData.description,
      linkUrl,
      linkAlt,
      commentText: "",
    },
    childBlocks: [],
    children: [],
    direction: null,
    format: "",
    indent: 0,
  };
  return newYoutubeHighlight;
};
