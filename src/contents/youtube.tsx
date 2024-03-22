import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import type { PlasmoCSConfig } from "plasmo";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { fetchYoutube } from "~/background/messages/fetchYoutube";
import { postYoutube } from "~/background/messages/postYoutube";
import type { SerializedBlockLinkNode } from "~/nodes/BlockLink";
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
  matches: ["https://*.youtube.com/*"],
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
    mutationFn: (youtubeMarker: SerializedBlockLinkNode) => {
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
    useState<SerializedBlockLinkNode | null>(null);

  useEffect(() => {
    // TODO Find a better way to add styles to a page. getStyles not working
    document
      .querySelectorAll(YT_CHAPTER_CONTAINER)
      .forEach((node) => ((node as HTMLElement).style.flex = "none"));
  }, []);
  console.log("markers", markers);

  if (!markers) return;

  const createMarker = (marker: SerializedBlockLinkNode) => {
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
      {markerBeingCommented ? (
        <CommentField
          marker={markerBeingCommented}
          closeTheCommentField={() => {
            setMarkerBeingCommented(null);
          }}
        />
      ) : null}
    </>
  );
};

const MarkerControl = ({
  markers,
  createMarker,
  deleteMarker,
}: {
  markers: SerializedBlockLinkNode[];
  createMarker: (marker: SerializedBlockLinkNode) => void;
  deleteMarker: (markerId: string) => void;
}) => {
  const [isMarkerActive, setIsMarkerActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      void (async () => {
        const activeMarker = await getActiveMarker(markers);

        if (activeMarker) {
          setIsMarkerActive(true);
        } else {
          setIsMarkerActive(false);
        }
      })();
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [isMarkerActive]);

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
    <div>
      {!isMarkerActive ? (
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
      ) : (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginLeft: 12,
            cursor: "pointer",
          }}
          onClick={handleMarkerRemove}
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
          Remove
        </div>
      )}
    </div>,
    targetElem,
  );
};

const Marker = ({
  marker,
}: {
  marker: SerializedBlockLinkNode;
}) => {
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
  marker: SerializedBlockLinkNode;
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
