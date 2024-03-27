import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { type PlasmoCSConfig } from "plasmo";
import {
  type Dispatch,
  type ElementRef,
  type SetStateAction,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { fetchHighlights } from "~/background/messages/fetchHighlights";
import {
  getOffsetRectRelativeToBody,
  listenContentScriptTriggers,
} from "~/utils/extension";
import {
  HIGHLIGHT_DATA_ATTRIBUTE,
  HIGHLIGHT_TAGNAME,
  type RectType,
  activateHighlight,
  applyHighlightText,
  createHighlightData,
  deserializeSelectionPath,
  isAnchorBeforeFocus,
  checkIfSelectionInsideMainContentArea,
} from "~/utils/extension/highlight";
import type { SerializedBlockHighlightNode as HighlightType } from "~/nodes/BlockHighlight";
import {
  Card,
  FormControl,
  GlobalStyles,
  IconButton,
  Textarea,
  CssVarsProvider,
  Box,
} from "@mui/joy";
import { GripVertical, Highlighter, MessageSquare, Trash } from "lucide-react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useStorage } from "@plasmohq/storage/hook";
import { postWebAnnotation } from "~/background/messages/postWebAnnotation";

const queryClient = new QueryClient();

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  exclude_matches: ["https://*.youtube.com/watch*"],
  all_frames: true,
  run_at: "document_idle",
};

const NewHighlight = () => {
  const [_, setIsTextSelected] = useStorage("is-text-selected", false);
  useStorage<boolean>("highlight-init", () => true);

  const { data: highlights } = useQuery({
    queryKey: ["fetchHighlights"],
    queryFn: fetchHighlights,
  });
  const createHighlightQuery = useMutation({
    mutationFn: (highlight: HighlightType) => {
      highlightRef.current?.addNewHighlightElem(highlight);
      return postWebAnnotation({
        updateType: "created",
        updatedBlockId: highlight.id,
        updatedBlock: highlight,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchHighlights"] }),
  });
  const deleteHighlightQuery = useMutation({
    mutationFn: (highlightId: string) => {
      highlightRef.current?.deleteHighlight(highlightId);
      return postWebAnnotation({
        updateType: "destroyed",
        updatedBlockId: highlightId,
        updatedBlock: null,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchHighlights"] }),
  });
  const updateHighlightQuery = useMutation({
    mutationFn: (highlight: HighlightType) => {
      return postWebAnnotation({
        updateType: "updated",
        updatedBlockId: highlight.id,
        updatedBlock: highlight,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchHighlights"] }),
  });
  const [activeHighlight, setActiveHighlight] = useState<HighlightType | null>(
    null,
  );

  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [commentBeingEdited, setCommentBeingEdited] = useState<string | null>(
    null,
  );

  const highlightRef = useRef<ElementRef<typeof Highlights>>(null);

  const handleHighlight = async () => {
    setShowTooltip(false);
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!range) return;
    const newHighlightData = await createHighlightData(range, highlights);
    if (!newHighlightData) return;
    createHighlightQuery.mutate(newHighlightData);
  };
  const handleHighlightComment = async () => {
    setShowTooltip(false);
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    if (!range) return;
    const newHighlightData = await createHighlightData(range, highlights);
    if (!newHighlightData) return;
    setCommentBeingEdited(newHighlightData.id);
    createHighlightQuery.mutate(newHighlightData);
  };

  useEffect(() => {
    listenContentScriptTriggers((type) => {
      if (type === "highlight") {
        void handleHighlight();
      } else if (type === "highlight-comment") {
        void handleHighlightComment();
      }
    });

    const handleKeypress = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === "KeyH") {
        void handleHighlightComment();
      } else if (e.altKey && e.code === "KeyH") {
        void handleHighlight();
      }
    };
    const handleMouseDown = () => {
      // console.log("mousedown");
      setShowTooltip(false);
    };
    const handleSelectionChange = () => {
      // console.log("selectionchange");

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        void setIsTextSelected(false);
        return;
      }
      void setIsTextSelected(true);

      // All of this just to get the end position of the selection.
      const focusNode = selection.focusNode;
      const focusOffset = selection.focusOffset;
      if (!focusNode || !focusOffset) return;
      const span = document.createElement("span");
      const newRange = new Range();
      newRange.setStart(focusNode, focusOffset);
      newRange.insertNode(span);
      const selectionEndPosition = getOffsetRectRelativeToBody(span);
      const parentNode = span.parentNode;
      parentNode?.removeChild(span);
      parentNode?.normalize();
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
    };
    const handleMouseUp = () => {
      // console.log("mouseup");
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      if (checkIfSelectionInsideMainContentArea(range)) {
        setShowTooltip(true);
      }
    };
    document.addEventListener("keypress", handleKeypress);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (target instanceof Element && target.tagName === HIGHLIGHT_TAGNAME) {
        const highlightId = target.getAttribute(HIGHLIGHT_DATA_ATTRIBUTE);
        const highlight = highlights?.find((hl) => hl.id === highlightId);
        if (!highlight) return;
        setActiveHighlight(highlight);
      } else {
        setActiveHighlight(null);
      }
    });
  }, [highlights]);

  if (!highlights) return <></>;

  const handleHighlightDelete = (highlightId: string) => {
    deleteHighlightQuery.mutate(highlightId);
    setActiveHighlight(null);
  };

  const handleCommentChange = (
    highlightId: string,
    text: string,
    rect: RectType,
  ) => {
    const currentHighlight = highlights.find((hl) => hl.id === highlightId);
    if (!currentHighlight) return;
    currentHighlight.properties.commentText = text;
    currentHighlight.properties.commentRect = rect;

    updateHighlightQuery.mutate(currentHighlight);
  };

  const handleCommentDisplay = (highlightId: string) => {
    setCommentBeingEdited(highlightId);
  };

  return (
    <>
      <Highlights ref={highlightRef} highlights={highlights} />
      <Comments
        highlights={highlights}
        commentBeingEdited={commentBeingEdited}
        setCommentBeingEdited={setCommentBeingEdited}
        handleCommentChange={handleCommentChange}
      />
      {activeHighlight && (
        <HighlightTooltip
          highlight={activeHighlight}
          handleHighlightDelete={handleHighlightDelete}
          handleCommentDisplay={handleCommentDisplay}
        />
      )}
      {showTooltip && (
        <SelectTooltip
          position={tooltipPosition}
          handleTooltipClick={handleHighlight}
        />
      )}
    </>
  );
};

type HighlightsHandle = {
  addNewHighlightElem: (hl: HighlightType) => void;
  deleteHighlight: (highlightId: string) => void;
};

type HighlightsProps = {
  highlights: HighlightType[];
};

const Highlights = forwardRef<HighlightsHandle, HighlightsProps>(
  ({ highlights }, ref) => {
    useEffect(() => {
      highlights.forEach((hl) => {
        if (!hl.properties?.highlightPath) return;
        const range = deserializeSelectionPath(hl.properties.highlightPath);
        if (!range) return;
        applyHighlightText(range, hl.id);
      });
    }, []);

    useEffect(() => {
      const handleMouseover = (e: MouseEvent) => {
        const target = e.target;
        if (target instanceof Element && target.tagName === HIGHLIGHT_TAGNAME) {
          const highlightId = target.getAttribute(HIGHLIGHT_DATA_ATTRIBUTE);
          highlightId && activateHighlight(highlightId, true);
        }
      };

      const handleMouseout = (e: MouseEvent) => {
        const target = e.target;
        if (target instanceof Element && target.tagName === HIGHLIGHT_TAGNAME) {
          const highlightId = target.getAttribute(HIGHLIGHT_DATA_ATTRIBUTE);
          highlightId && activateHighlight(highlightId, false);
        }
      };

      document.addEventListener("mouseover", handleMouseover);
      document.addEventListener("mouseout", handleMouseout);
      return () => {
        document.removeEventListener("mouseover", handleMouseover);
        document.removeEventListener("mouseout", handleMouseout);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      addNewHighlightElem(hl: HighlightType) {
        if (!hl.properties?.highlightPath) return;
        const range = deserializeSelectionPath(hl.properties.highlightPath);
        if (!range) return;
        applyHighlightText(range, hl.id);
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

    return null;
  },
);

const Comments = ({
  highlights,
  commentBeingEdited,
  handleCommentChange,
  setCommentBeingEdited,
}: {
  highlights: HighlightType[];
  commentBeingEdited: string | null;
  handleCommentChange: (
    highlightId: string,
    text: string,
    rect: RectType,
  ) => void;
  setCommentBeingEdited: Dispatch<SetStateAction<string | null>>;
}) => {
  return highlights.map((highlight) => {
    return highlight.id === commentBeingEdited ? (
      <Comment
        key={highlight.id}
        isEditing
        highlight={highlight}
        handleCommentChange={handleCommentChange}
        setCommentBeingEdited={setCommentBeingEdited}
      />
    ) : highlight.properties.commentText ? (
      <Comment
        key={highlight.id}
        isEditing={false}
        highlight={highlight}
        handleCommentChange={handleCommentChange}
        setCommentBeingEdited={setCommentBeingEdited}
      />
    ) : null;
  });
};

const Comment = ({
  isEditing,
  highlight,
  handleCommentChange,
  setCommentBeingEdited,
}: {
  isEditing: boolean;
  highlight: HighlightType;
  handleCommentChange: (
    highlightId: string,
    text: string,
    rect: RectType,
  ) => void;
  setCommentBeingEdited: Dispatch<SetStateAction<string | null>>;
}) => {
  const textarea = useRef<ElementRef<typeof Textarea>>(null);
  const formRef = useRef<ElementRef<typeof FormControl>>(null);
  const isDragging = useRef(false);
  const commentPositionLeft = useRef(highlight.properties.commentRect.left);
  const commentPositionTop = useRef(highlight.properties.commentRect.top);

  const [commentText, setCommentText] = useState(
    highlight.properties.commentText,
  );

  useEffect(() => {
    isEditing &&
      textarea.current &&
      textarea.current.querySelector("textarea")?.focus();
  }, [isEditing, textarea.current]);

  useEffect(() => {
    const handleMousemove = (e: MouseEvent) => {
      if (isDragging.current && formRef.current) {
        commentPositionLeft.current = commentPositionLeft.current + e.movementX;
        commentPositionTop.current = commentPositionTop.current + e.movementY;
        formRef.current.style.left = commentPositionLeft.current + "px";
        formRef.current.style.top = commentPositionTop.current + "px";
      }
    };
    document.addEventListener("mousemove", handleMousemove);

    return () => {
      document.removeEventListener("mousemove", handleMousemove);
    };
  }, []);

  return (
    <FormControl
      ref={formRef}
      key={highlight.id}
      orientation="horizontal"
      sx={{
        position: "absolute",
        top: commentPositionTop.current,
        left: commentPositionLeft.current,
        zIndex: isEditing ? 1000 : 100,
        alignItems: "flex-start",
        "&:hover #comment-drag": {
          visibility: "visible",
        },
      }}
    >
      <Box
        id="comment-drag"
        sx={{
          visibility: "hidden",
          cursor: "grab",
          "&:active": { cursor: "grabbing" },
        }}
        onMouseDown={() => {
          isDragging.current = true;
          document.body.style.userSelect = "none";
        }}
        onMouseUp={() => {
          isDragging.current = false;
          document.body.style.removeProperty("user-select");
          if (formRef.current) {
            handleCommentChange(
              highlight.id,
              commentText,
              getOffsetRectRelativeToBody(
                formRef.current.getBoundingClientRect(),
              ),
            );
          }
        }}
      >
        <GripVertical />
      </Box>
      <Textarea
        ref={textarea}
        placeholder="Add a comment..."
        variant={isEditing ? "soft" : "outlined"}
        minRows={1}
        maxRows={5}
        value={commentText}
        sx={{
          width: 300,
          marginTop: "calc(var(--Textarea-paddingBlock) * -1)",
        }}
        onChange={(e) => {
          if (isEditing) {
            setCommentText(e.target.value);
          }
        }}
        onBlur={() => {
          if (formRef.current) {
            handleCommentChange(
              highlight.id,
              commentText,
              getOffsetRectRelativeToBody(
                formRef.current.getBoundingClientRect(),
              ),
            );
            setCommentBeingEdited(null);
          }
        }}
        onFocus={() => setCommentBeingEdited(highlight.id)}
      />
    </FormControl>
  );
};

const SelectTooltip = ({
  position,
  handleTooltipClick,
}: {
  position: { x: number; y: number };
  handleTooltipClick: () => void;
}) => {
  return (
    <IconButton
      variant="solid"
      color="primary"
      sx={{ position: "absolute", top: position.y, left: position.x }}
      onMouseDown={handleTooltipClick}
    >
      <Highlighter />
    </IconButton>
  );
};

const HighlightTooltip = ({
  highlight,
  handleHighlightDelete,
  handleCommentDisplay,
}: {
  highlight: HighlightType;
  handleHighlightDelete: (highlightId: string) => void;
  handleCommentDisplay: (highlightId: string) => void;
}) => {
  const top = highlight.properties.highlightRect.top;
  const left =
    highlight.properties.highlightRect.right -
    highlight.properties.highlightRect.width / 2;

  return (
    <Card
      variant="outlined"
      orientation="horizontal"
      size="sm"
      sx={{
        position: "absolute",
        top: top,
        left: left,
        transform: "translate(-50%, -100%)",
        py: "0.25rem",
        px: "0.5rem",
        boxShadow: "sm",
      }}
    >
      <IconButton
        variant="plain"
        size="sm"
        sx={{ minWidth: "1.75rem", minHeight: "1.75rem" }}
        onClick={() => handleHighlightDelete(highlight.id)}
      >
        <Trash size={20} />
      </IconButton>
      <IconButton
        variant="plain"
        size="sm"
        sx={{ minWidth: "1.75rem", minHeight: "1.75rem" }}
        onClick={() => handleCommentDisplay(highlight.id)}
      >
        <MessageSquare size={20} />
      </IconButton>
    </Card>
  );
};

const styleElement = document.createElement("style");

const styleCache = createCache({
  key: "plasmo-joyui-cache",
  prepend: true,
  container: styleElement,
});

export const getStyle = () => styleElement;

const Wrapper = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider value={styleCache}>
        {/* https://github.com/mui/material-ui/issues/37470 */}
        <CssVarsProvider colorSchemeSelector={":host"}>
          <GlobalStyles
            styles={{
              "& .lucide": {
                color: "var(--Icon-color)",
                margin: "var(--Icon-margin)",
                fontSize: "var(--Icon-fontSize, 20px)",
              },
            }}
          />
          <NewHighlight />
        </CssVarsProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
};

export default Wrapper;
