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

export const placeMarkers = (
  ytProgressBar: Element,
  markedTime: number,
  fullVideoLength: number,
) => {
  const markerElem = document.createElement("div");
  markerElem.style.position = "absolute";
  markerElem.style.top = "-2.5px";
  markerElem.style.left = "0px";
  markerElem.style.height = "6px";
  markerElem.style.width = "6px";
  markerElem.style.borderRadius = "10px";
  markerElem.style.backgroundColor = "rgb(238, 238, 238)";
  markerElem.style.zIndex = "100";
  markerElem.style.border = "2px solid #EB3323";

  const barWidth = ytProgressBar?.clientWidth;

  if (!markedTime || !barWidth || !fullVideoLength) return;

  const markerPositionLeft = (markedTime * barWidth) / fullVideoLength;

  markerElem.style.left = markerPositionLeft + "px";

  ytProgressBar?.append(markerElem);
};
