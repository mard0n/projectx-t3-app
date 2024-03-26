import {
  CssVarsProvider,
  FormControl,
  GlobalStyles,
  Stack,
  Textarea,
  Tooltip,
  Typography,
  Box,
  extendTheme,
} from "@mui/joy";
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
import { uploadImageToAWS } from "~/utils/extension/uploadImageToAWS";
import {
  YT_PROGRESS_BAR,
  YT_CHAPTER_CONTAINER,
  extractTimeFromYoutubeLink,
  getActiveMarker,
  getMarkerPosition,
  createYoutubeMarkData,
  YT_CONTROLS,
  captureCurrentYoutubeFrame,
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
  const updateYoutubeMarkerQuery = useMutation({
    mutationFn: (youtubeMarker: MarkerType) => {
      const update = [
        {
          updateType: "updated" as const,
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

  if (!markers) return;

  const handleMarkerClick = () => {
    void (async () => {
      const newYoutubeMark = await createYoutubeMarkData();
      if (!newYoutubeMark) return;
      createYoutubeMarkerQuery.mutate(newYoutubeMark);
      const thumbnailImage = await captureCurrentYoutubeFrame();
      let thumbnailLink;
      if (thumbnailImage) {
        thumbnailLink = await uploadImageToAWS(thumbnailImage);
      }
      newYoutubeMark.properties.thumbnail = thumbnailLink;
      updateYoutubeMarkerQuery.mutate(newYoutubeMark);
    })();
  };
  const handleMarkerRemove = () => {
    void (async () => {
      const activeMarker = await getActiveMarker(markers);
      if (activeMarker) {
        deleteYoutubeMarkerQuery.mutate(activeMarker.id);
      }
    })();
  };

  const handleCommentClick = () => {
    void (async () => {
      const newYoutubeMark = await createYoutubeMarkData();
      if (!newYoutubeMark) return;
      createYoutubeMarkerQuery.mutate(newYoutubeMark);

      setMarkerBeingCommented(newYoutubeMark);

      const thumbnailImage = await captureCurrentYoutubeFrame();
      let thumbnailLink;
      if (thumbnailImage) {
        thumbnailLink = await uploadImageToAWS(thumbnailImage);
      }
      newYoutubeMark.properties.thumbnail = thumbnailLink;
      updateYoutubeMarkerQuery.mutate(newYoutubeMark);
    })();
  };

  const handleCommentSave = (markerId: string, text: string) => {
    setMarkerBeingCommented(null);
    const marker = markers.find((mrkr) => mrkr.id === markerId);

    if (!marker) return;
    marker.properties.commentText = text;
    updateYoutubeMarkerQuery.mutate(marker);
  };

  return (
    <>
      <MarkerControl
        markers={markers}
        handleMarkerClick={handleMarkerClick}
        handleCommentClick={handleCommentClick}
        handleMarkerRemove={handleMarkerRemove}
      />
      {markers?.map((marker) => {
        return <Marker key={marker.id} marker={marker} />;
      })}
      {markerBeingCommented ? (
        <CommentField
          marker={markerBeingCommented}
          handleCommentSave={handleCommentSave}
        />
      ) : null}
    </>
  );
};

const MarkerControl = ({
  markers,
  handleMarkerClick,
  handleCommentClick,
  handleMarkerRemove,
}: {
  markers: MarkerType[];
  handleMarkerClick: () => void;
  handleCommentClick: () => void;
  handleMarkerRemove: () => void;
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
                Mark and add a comment (⌥ + c)
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
              onClick={handleCommentClick}
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
  if (!targetElem) return;

  return createPortal(
    <Tooltip
      sx={{
        padding: "5px 8px",
        marginBottom: "4px !important",
        borderRadius: 3,
        backgroundColor: "rgba(45, 45, 45, 0.9)",
        maxWidth: 300,
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
          {marker.properties.commentText
            ? marker.properties.commentText
            : "No comment"}
        </Typography>
      }
    >
      <Box
        sx={{
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
      />
    </Tooltip>,
    targetElem,
  );
};

const CommentField = ({
  marker,
  handleCommentSave,
}: {
  marker: MarkerType;
  handleCommentSave: (markerId: string, text: string) => void;
}) => {
  const [textareaValue, setTextareaValue] = useState("");
  const youtubeContainer = document.getElementById("container");
  if (!youtubeContainer) return;

  return (
    <div
      style={{
        marginTop: 56,
        width: "1px",
        height: "56.25vw",
        maxHeight: "calc(100vh - 169px)",
        minHeight: "480px",
      }}
    >
      <FormControl
        sx={{
          position: "absolute",
          left: "50vw",
          bottom: 60,
          transform: "translate(-50%, 0px)",
          zIndex: 100,
          padding: "8px 12px",
          width: 300,
        }}
      >
        <Textarea
          autoFocus
          size="lg"
          name="Solid"
          placeholder="Add your comment..."
          variant="solid"
          color="neutral"
          minRows={3}
          maxRows={7}
          value={textareaValue}
          onChange={(e) => setTextareaValue(e.target.value)}
          sx={{
            fontSize: 12,
            lineHeight: "16px",
            backgroundColor: "rgba(45, 45, 45, 0.85)",
            borderRadius: 8,
            "&:focus-within::before": {
              boxSizing: "border-box",
              content: '""',
              display: "block",
              position: "absolute",
              pointerEvents: "none",
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              zIndex: "1",
              borderRadius: "inherit",
              boxShadow: "0px 0px 0px 2px rgba(12,153,255,1)",
            },
          }}
          onBlur={() => {
            handleCommentSave(marker.id, textareaValue);
          }}
        />
      </FormControl>
    </div>
  );
};

import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

const styleElement = document.createElement("style");

const styleCache = createCache({
  key: "plasmo-joyui-cache",
  prepend: true,
  container: styleElement,
});

// Because we are using portals the styles need to be available globally
export const getRootContainer = () =>
  new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const rootContainerParent = document.body;
      if (rootContainerParent) {
        clearInterval(checkInterval);
        const rootContainer = document.createElement("div");
        rootContainerParent.appendChild(styleElement);
        // rootContainer.setAttribute("id", "project-x-style-container");
        rootContainerParent.appendChild(rootContainer);
        resolve(rootContainer);
      }
    }, 137);
  });

const Wrapper = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider value={styleCache}>
        {/* https://github.com/mui/material-ui/issues/37470 */}
        <CssVarsProvider
          theme={extendTheme({ cssVarPrefix: "project-x" })}
          colorSchemeSelector=":host"
        >
          <GlobalStyles
            styles={{
              "& .lucide": {
                color: "var(--Icon-color)",
                margin: "var(--Icon-margin)",
                fontSize: "var(--Icon-fontSize, 20px)",
              },
            }}
          />
          <Youtube />
        </CssVarsProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
};


export default Wrapper;
