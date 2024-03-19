import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { type PlasmoCSConfig } from "plasmo";
import {
  type ChangeEvent,
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { fetchHighlights } from "~/background/messages/fetchHighlights";
import {
  deserializeSelectionPath,
  getOffsetRectRelativeToBody,
  isAnchorBeforeFocus,
} from "~/utils/extension";
import {
  HIGHLIGHT_DATA_ATTRIBUTE,
  HIGHLIGHT_TAGNAME,
  createHighlightData,
  highlight,
} from "~/utils/extension/highlight";
import {
  createHighlightPost,
  deleteHighlightPost,
  updateHighlightPost,
} from "~/background/messages/postHighlight";
import type { SerializedBlockHighlightNode } from "~/nodes/BlockHighlight";

const queryClient = new QueryClient();

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_idle",
};

type HighlightAndCommentsProps = {
  highlights: SerializedBlockHighlightNode[];
  handleHighlightDelete: (highlightId: string) => void;
  handleCommentTextChange: (highlightId: string, text: string) => void;
};

type HighlightAndCommentsHandle = {
  addNewHighlightElem: (hl: SerializedBlockHighlightNode) => void;
  deleteHighlight: (highlightId: string) => void;
};

const HighlightAndComments = forwardRef<
  HighlightAndCommentsHandle,
  HighlightAndCommentsProps
>(({ highlights, handleHighlightDelete, handleCommentTextChange }, ref) => {
  const [tooltipToDisplay, setTooltipToDisplay] = useState<string | null>(null);
  const [commentToDisplay, setCommentToDisplay] = useState<string | null>(null);
  console.log("commentToDisplay", commentToDisplay);

  useEffect(() => {
    highlights.forEach((hl) => {
      if (!hl.properties?.highlightPath) return;
      const range = deserializeSelectionPath(hl.properties.highlightPath);
      console.log("range", range);
      if (!range) return;
      highlight(range, hl.id);
    });

    document.addEventListener("mouseover", (e: Event) => {
      const target = e.target;
      if (target instanceof Element && target.tagName === HIGHLIGHT_TAGNAME) {
        const highlightId = target.getAttribute(HIGHLIGHT_DATA_ATTRIBUTE);
        highlightId && setTooltipToDisplay(highlightId);
      }
    });
    document.addEventListener("mouseout", () => {
      setTooltipToDisplay(null);
    });
  }, []);

  useImperativeHandle(ref, () => ({
    addNewHighlightElem(hl: SerializedBlockHighlightNode) {
      if (!hl.properties?.highlightPath) return;
      const range = deserializeSelectionPath(hl.properties.highlightPath);
      console.log("range", range);
      if (!range) return;
      highlight(range, hl.id);
    },
    deleteHighlight(highlightId: string) {
      const highlightElems = document.querySelectorAll(
        `${HIGHLIGHT_TAGNAME}[${HIGHLIGHT_DATA_ATTRIBUTE}="${highlightId}"]`,
      );

      highlightElems.forEach((element) => {
        const parent = element.parentNode;
        while (element.firstChild) {
          parent?.insertBefore(element.firstChild, element);
        }
        parent?.removeChild(element);
      });
    },
  }));

  return highlights.map((hl) => {
    const hlCenter =
      (hl.properties.highlightRect.left + hl.properties.highlightRect.right) /
      2;
    const hlTop = hl.properties.highlightRect.top;

    const commentTop = hl.properties.highlightRect.top;
    const commentLeft = hl.properties.contextRect.right + 40;
    console.log("hl.id", hl.id);

    // TODO Check if comments on top of each other

    return (
      <Fragment key={hl.id}>
        <div
          style={{
            position: "absolute",
            left: hlCenter,
            top: hlTop,
            transform: `translate(-50%, -100%)`,
            display: "flex",
            gap: "16px",
            padding: "8px 10px",
            backgroundColor: "#000000ab",
            visibility:
              tooltipToDisplay === null || tooltipToDisplay === hl.id
                ? "visible"
                : "hidden", // TODO fix visibility when other elements are shown
            opacity: tooltipToDisplay === hl.id ? 1 : 0,
            transitionProperty: "opacity",
            transitionDelay: !!tooltipToDisplay ? "0s" : "2s",
          }}
          onMouseEnter={() => {
            setTooltipToDisplay(hl.id);
          }}
          onMouseOut={() => {
            setTooltipToDisplay(null);
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              color: "white",
              cursor: "pointer",
            }}
            onClick={() => {
              handleHighlightDelete(hl.id);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </div>
          <div
            style={{
              width: 16,
              height: 16,
              color: "white",
              cursor: "pointer",
            }}
            onClick={() => {
              setTooltipToDisplay(null);
              setCommentToDisplay(hl.id);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
              />
            </svg>
          </div>
        </div>
        {(hl.properties.commentText || commentToDisplay === hl.id) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              position: "absolute",
              top: commentTop,
              left: commentLeft,
            }}
          >
            {/* <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
              style={{ height: 16, width: 16, cursor: 'grab' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
              />
            </svg> */}
            <input
              value={hl.properties.commentText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                handleCommentTextChange(
                  hl.id,
                  (e.target as HTMLInputElement).value,
                );
              }}
              onBlur={() => {
                setCommentToDisplay(null);
              }}
              autoFocus={commentToDisplay === hl.id}
            />
          </div>
        )}
      </Fragment>
    );
  });
});

const Tooltip = ({
  position,
  handleTooltipClick,
}: {
  position: { x: number; y: number };
  handleTooltipClick: () => void;
}) => {
  return (
    <div
      style={{
        width: "24px",
        height: "24px",
        border: "1px solid #333",
        padding: "3px",
        borderRadius: "4px",
        backgroundColor: "white",
        position: "absolute",
        top: "0px",
        left: "0px",
        cursor: "pointer",
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onMouseDown={handleTooltipClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
        />
      </svg>
    </div>
  );
};

const NewHighlight = () => {
  const { data: highlights } = useQuery({
    queryKey: ["fetchHighlights"],
    queryFn: fetchHighlights,
  });
  const createHighlightQuery = useMutation({
    mutationFn: (highlight: SerializedBlockHighlightNode) => {
      highlightRef.current?.addNewHighlightElem(highlight);
      return createHighlightPost(highlight);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchHighlights"] }),
  });
  const deleteHighlightQuery = useMutation({
    mutationFn: (highlightId: string) => {
      highlightRef.current?.deleteHighlight(highlightId);
      return deleteHighlightPost(highlightId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchHighlights"] }),
  });
  const updateHighlightQuery = useMutation({
    mutationFn: (highlight: SerializedBlockHighlightNode) => {
      return updateHighlightPost(highlight);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchHighlights"] }),
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  type HighlightAndCommentsHandle = React.ElementRef<
    typeof HighlightAndComments
  >;
  const highlightRef = useRef<HighlightAndCommentsHandle>(null);

  useEffect(() => {
    console.log("Hello from New Highlight");

    document.addEventListener("mousedown", () => {
      console.log("mousedown");
      setShowTooltip(false);
    });
    document.addEventListener("selectionchange", () => {
      console.log("selectionchange");

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      // All of this just to get the end position of the selection.
      const focusNode = selection.focusNode;
      const focusOffset = selection.focusOffset;
      if (!focusNode || !focusOffset) return;
      const span = document.createElement("span");
      const newRange = new Range();
      newRange.setStart(focusNode, focusOffset);
      newRange.insertNode(span);
      const selectionEndPosition = getOffsetRectRelativeToBody(span);
      focusNode.parentNode?.removeChild(span);
      focusNode.parentNode?.normalize();
      selection.removeRange(newRange);

      if (isAnchorBeforeFocus(selection)) {
        setTooltipPosition({
          x: selectionEndPosition.x - 24 / 2,
          y: selectionEndPosition.y + 1 * 24,
        });
      } else {
        setTooltipPosition({
          x: selectionEndPosition.x - 24 / 2,
          y: selectionEndPosition.y - 1.5 * 24,
        });
      }
    });
    document.addEventListener("mouseup", () => {
      console.log("mouseup");
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      setShowTooltip(true);
    });
    return () => {
      // document.removeEventListener("mousedown", handleMouseDown);
      // document.removeEventListener("selectionchange", handleSelectionChange);
      // document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (!highlights) return <></>;

  const handleTooltipClick = async () => {
    setShowTooltip(false);
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    if (!range) return;
    const newHighlightData = await createHighlightData(range);
    if (!newHighlightData) return;
    createHighlightQuery.mutate(newHighlightData);
  };

  const handleHighlightDelete = (highlightId: string) => {
    deleteHighlightQuery.mutate(highlightId);
  };

  const handleCommentTextChange = (highlightId: string, text: string) => {
    const currentHighlight = highlights.find((hl) => hl.id === highlightId);
    if (!currentHighlight) return;
    currentHighlight.properties.commentText = text;
    console.log("currentHighlight", currentHighlight);

    updateHighlightQuery.mutate(currentHighlight);
  };

  return (
    <>
      <HighlightAndComments
        ref={highlightRef}
        highlights={highlights}
        handleHighlightDelete={handleHighlightDelete}
        handleCommentTextChange={handleCommentTextChange}
      />
      {showTooltip && (
        <Tooltip
          position={tooltipPosition}
          handleTooltipClick={handleTooltipClick}
        />
      )}
    </>
  );
};

const Wrapper = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <NewHighlight />
    </QueryClientProvider>
  );
};

export default Wrapper;
