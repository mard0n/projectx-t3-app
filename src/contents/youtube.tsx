import { Stack, Tooltip, Typography } from "@mui/joy";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import type { PlasmoCSConfig } from "plasmo";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchYoutube } from "~/background/messages/fetchYoutube";
import { postYoutube } from "~/background/messages/postYoutube";
import type { SerializedBlockLinkNode as MarkerType } from "~/nodes/BlockLink";
import { getOffsetRectRelativeToBody } from "~/utils/extension";
import {
  YT_PROGRESS_BAR,
  YT_CHAPTER_CONTAINER,
  extractTimeFromYoutubeLink,
  getActiveMarker,
  getMarkerPosition,
  createYoutubeMarkData,
  getCurrentProgressInSec,
  YT_CONTROLS,
} from "~/utils/extension/youtube";

const queryClient = new QueryClient();

export const config: PlasmoCSConfig = {
  matches: ["https://*.youtube.com/watch*"],
  exclude_matches: ["http://localhost:3000/*"],
  all_frames: true,
  run_at: "document_idle",
};

const Youtube = () => {
  const { data: markers } = useQuery({
    queryKey: ["fetchYoutubeMarkers"],
    queryFn: fetchYoutube,
  });
  const createYoutubeMarkerQuery = useMutation({
    mutationFn: (youtubeMarker: MarkerType) => {
      const update = [
        {
          updateType: "created" as const,
          updatedBlockId: youtubeMarker.id,
          updatedBlock: youtubeMarker,
        },
      ];
      return postYoutube(update);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchYoutubeMarkers"] }),
  });
  const deleteYoutubeMarkerQuery = useMutation({
    mutationFn: (youtubeMarkerId: string) => {
      const update = [
        {
          updateType: "destroyed" as const,
          updatedBlockId: youtubeMarkerId,
          updatedBlock: null,
        },
      ];
      return postYoutube(update);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchYoutubeMarkers"] }),
  });

  const [markerBeingCommented, setMarkerBeingCommented] =
    useState<MarkerType | null>(null);

  useEffect(() => {
    // TODO Find a better way to add styles to a page. getStyles not working
    document
      .querySelectorAll(YT_CHAPTER_CONTAINER)
      .forEach((node) => ((node as HTMLElement).style.flex = "none"));
  }, []);
  console.log("markers", markers);

  if (!markers) return;

  const createMarker = (marker: MarkerType) => {
    createYoutubeMarkerQuery.mutate(marker);
    setMarkerBeingCommented(marker);
  };
  const deleteMarker = (markerId: string) => {
    deleteYoutubeMarkerQuery.mutate(markerId);
  };

  return (
    <>
      <MarkerControl
        markers={markers}
        createMarker={createMarker}
        deleteMarker={deleteMarker}
      />
      {markers?.map((marker) => {
        return <Marker key={marker.id} marker={marker} />;
      })}
      {/* {markerBeingCommented ? (
        <CommentField
          marker={markerBeingCommented}
          closeTheCommentField={() => {
            setMarkerBeingCommented(null);
          }}
        />
      ) : null} */}
    </>
  );
};

const MarkerControl = ({
  markers,
  createMarker,
  deleteMarker,
}: {
  markers: MarkerType[];
  createMarker: (marker: MarkerType) => void;
  deleteMarker: (markerId: string) => void;
}) => {
  const [isMarkerActive, setIsMarkerActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void (async () => {
        const activeMarker = await getActiveMarker(markers);

        if (activeMarker) {
          setIsMarkerActive(true);
        } else {
          setIsMarkerActive(false);
        }
      })();
    }, 500);
    return () => {
      intervalRef.current && clearInterval(intervalRef.current);
    };
  }, [markers]);

  const handleMarkerClick = async () => {
    console.log("handleMarkerClick");
    const newYoutubeMark = await createYoutubeMarkData();
    const currentTime = getCurrentProgressInSec();
    if (!newYoutubeMark || !currentTime) return;
    createMarker(newYoutubeMark);
  };

  const handleMarkerRemove = async () => {
    console.log("handleMarkerRemove");
    const activeMarker = await getActiveMarker(markers);
    console.log("activeMarker", activeMarker);
    if (activeMarker) {
      deleteMarker(activeMarker.id);
    }
  };

  const targetElem = document.querySelector(YT_CONTROLS);
  if (!targetElem) return;

  return createPortal(
    <>
      {!isMarkerActive ? (
        <Stack direction="row" spacing={1}>
          <Tooltip
            placement="top"
            sx={{
              padding: "5px 8px",
              marginBottom: "4px !important",
              borderRadius: 3,
              backgroundColor: "rgba(45, 45, 45, 0.9)",
            }}
            title={
              <Typography
                level="title-sm"
                sx={{
                  color: "white",
                  fontSize: 12,
                  lineHeight: "16px",
                }}
              >
                Mark (⌥ + m)
              </Typography>
            }
          >
            <div
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
              onClick={handleMarkerClick}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
              >
                <path d="M8 11L27 11L17.5 26L8 11Z" fill="white" />
              </svg>
              Mark
            </div>
          </Tooltip>
          <Tooltip
            placement="top"
            sx={{
              padding: "5px 8px",
              marginBottom: "4px !important",
              borderRadius: 3,
              backgroundColor: "rgba(45, 45, 45, 0.9)",
            }}
            title={
              <Typography
                level="title-sm"
                sx={{
                  color: "white",
                  fontSize: 12,
                  lineHeight: "16px",
                }}
              >
                Mark and Comment (⌥ + c)
              </Typography>
            }
          >
            <div
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
              onClick={handleMarkerClick}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10 11H25L17.5 18.5L25 26H10V11Z" fill="white" />
              </svg>
              Comment
            </div>
          </Tooltip>
        </Stack>
      ) : (
        <Tooltip
          placement="top"
          sx={{
            padding: "5px 8px",
            marginBottom: "4px !important",
            borderRadius: 3,
            backgroundColor: "rgba(45, 45, 45, 0.9)",
          }}
          title={
            <Typography
              level="title-sm"
              sx={{
                color: "white",
                fontSize: 12,
                lineHeight: "16px",
              }}
            >
              Remove
            </Typography>
          }
        >
          <div
            style={{
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
            onClick={handleMarkerRemove}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M26 11L10 26V11H26Z" fill="white" />
            </svg>
            Remove
          </div>
        </Tooltip>
      )}
    </>,
    targetElem,
  );
};

const Marker = ({ marker }: { marker: MarkerType }) => {
  const markerTime = extractTimeFromYoutubeLink(marker.properties.linkUrl);
  if (!markerTime) return <></>;
  const markerPosition = getMarkerPosition(markerTime);
  if (!markerPosition) return <></>;

  const targetElem = document.querySelector(YT_PROGRESS_BAR);
  console.log("Marker targetElem", targetElem);
  if (!targetElem) return;

  return createPortal(
    <div
      style={{
        position: "absolute",
        top: "-2.5px",
        left: markerPosition - 3,
        height: "6px",
        width: "6px",
        borderRadius: "10px",
        backgroundColor: "rgb(238, 238, 238)",
        zIndex: "100",
        border: "2px solid #EB3323",
        cursor: "pointer",
      }}
    />,
    targetElem,
  );
};

const CommentField = ({
  marker,
  closeTheCommentField,
}: {
  marker: MarkerType;
  closeTheCommentField: () => void;
}) => {
  const progressBarElem = document.querySelector(YT_PROGRESS_BAR);
  if (!progressBarElem) return;
  const markerTime = extractTimeFromYoutubeLink(marker.properties.linkUrl);
  if (!markerTime) return <></>;
  const markerPosition = getMarkerPosition(markerTime);
  if (!markerPosition) return;
  const progressBarPosition = getOffsetRectRelativeToBody(progressBarElem);
  return (
    <>
      <div
        contentEditable
        style={{
          position: "absolute",
          top: progressBarPosition.top + 10,
          left: progressBarPosition.left + markerPosition,
          width: 200,
          height: 32,
          backgroundColor: "#00000099",
          color: "white",
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        onKeyUp={(e) => {
          e.stopPropagation();
        }}
        onInput={(e) => {
          e.stopPropagation();
        }}
        onChange={(e) => {
          e.stopPropagation();
        }}
        onBlur={closeTheCommentField}
      />
    </>
  );
};

const Wrapper = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Youtube />
    </QueryClientProvider>
  );
};

export default Wrapper;
