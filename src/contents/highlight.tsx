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
  deserializeSelectionPath,
  getOffsetRectRelativeToBody,
  isAnchorBeforeFocus,
  listenContentScriptTriggers,
} from "~/utils/extension";
import {
  HIGHLIGHT_DATA_ATTRIBUTE,
  HIGHLIGHT_TAGNAME,
  type RectType,
  activateHighlight,
  applyHighlightText,
  createHighlightData,
} from "~/utils/extension/highlight";
import {
  createHighlightPost,
  deleteHighlightPost,
  updateHighlightPost,
} from "~/background/messages/postHighlight";
import type { SerializedBlockHighlightNode as HighlightType } from "~/nodes/BlockHighlight";
import { Storage } from "@plasmohq/storage";
import {
  Card,
  FormControl,
  GlobalStyles,
  IconButton,
  Textarea,
  CssVarsProvider,
} from "@mui/joy";
import { Highlighter, MessageSquare, Trash } from "lucide-react";

const queryClient = new QueryClient();
const storage = new Storage();

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_idle",
};

const NewHighlight = () => {
  const { data: highlights } = useQuery({
    queryKey: ["fetchHighlights"],
    queryFn: fetchHighlights,
  });
  const createHighlightQuery = useMutation({
    mutationFn: (highlight: HighlightType) => {
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
    mutationFn: (highlight: HighlightType) => {
      return updateHighlightPost(highlight);
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
    const range = selection?.getRangeAt(0);
    if (!range) return;
    const newHighlightData = await createHighlightData(range, highlights);
    if (!newHighlightData) return;
    createHighlightQuery.mutate(newHighlightData);
  };

  useEffect(() => {
    listenContentScriptTriggers((type) => {
      if (type === "highlight") {
        void handleHighlight();
      } else if (type === "highlight-comment") {
      }
    });
    document.addEventListener("mousedown", () => {
      // console.log("mousedown");
      setShowTooltip(false);
    });
    document.addEventListener("selectionchange", () => {
      // console.log("selectionchange");

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        void (async () => {
          await storage.set("isTextSelected", false);
        })();
        return;
      }
      void (async () => {
        await storage.set("isTextSelected", true);
      })();

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
      // console.log("mouseup");
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

  const handleCommentTextChange = (
    highlightId: string,
    text: string,
    rect: RectType,
  ) => {
    const currentHighlight = highlights.find((hl) => hl.id === highlightId);
    if (!currentHighlight) return;
    currentHighlight.properties.commentText = text;
    currentHighlight.properties.commentRect = rect;
    console.log("currentHighlight", currentHighlight);

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
        handleCommentTextChange={handleCommentTextChange}
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
      document.addEventListener("mouseover", (e) => {
        const target = e.target;
        if (target instanceof Element && target.tagName === HIGHLIGHT_TAGNAME) {
          const highlightId = target.getAttribute(HIGHLIGHT_DATA_ATTRIBUTE);
          highlightId && activateHighlight(highlightId, true);
        }
      });
      document.addEventListener("mouseout", (e) => {
        const target = e.target;
        if (target instanceof Element && target.tagName === HIGHLIGHT_TAGNAME) {
          const highlightId = target.getAttribute(HIGHLIGHT_DATA_ATTRIBUTE);
          highlightId && activateHighlight(highlightId, false);
        }
      });
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
  handleCommentTextChange,
  setCommentBeingEdited,
}: {
  highlights: HighlightType[];
  commentBeingEdited: string | null;
  handleCommentTextChange: (
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
        handleCommentTextChange={handleCommentTextChange}
        setCommentBeingEdited={setCommentBeingEdited}
      />
    ) : highlight.properties.commentText ? (
      <Comment
        key={highlight.id}
        isEditing={false}
        highlight={highlight}
        handleCommentTextChange={() => null}
        setCommentBeingEdited={setCommentBeingEdited}
      />
    ) : null;
  });
};

const Comment = ({
  isEditing,
  highlight,
  handleCommentTextChange,
  setCommentBeingEdited,
}: {
  isEditing: boolean;
  highlight: HighlightType;
  handleCommentTextChange: (
    highlightId: string,
    text: string,
    rect: RectType,
  ) => void;
  setCommentBeingEdited: Dispatch<SetStateAction<string | null>>;
}) => {
  const textarea = useRef<ElementRef<typeof Textarea>>(null);

  useEffect(() => {
    isEditing &&
      textarea.current &&
      textarea.current.querySelector("textarea")?.focus();
  }, [isEditing, textarea.current]);

  const [commentText, setCommentText] = useState(
    highlight.properties.commentText,
  );
  const left = highlight.properties.commentRect.left;
  const top = highlight.properties.commentRect.top;

  return (
    <FormControl
      key={highlight.id}
      sx={{
        position: "absolute",
        top,
        left,
        zIndex: isEditing ? 1000 : 100,
      }}
    >
      {/* <FormControl sx={{ position: "absolute", top, left }}> */}
      {/* <FormLabel>Your comment</FormLabel> */}
      <Textarea
        ref={textarea}
        placeholder="Add a comment..."
        variant={isEditing ? "soft" : "plain"}
        minRows={1}
        maxRows={5}
        value={commentText}
        sx={{ width: 300 }}
        onChange={(e) => {
          if (isEditing) {
            setCommentText(e.target.value);
          }
        }}
        onBlur={() => {
          if (textarea.current) {
            handleCommentTextChange(
              highlight.id,
              commentText,
              textarea.current.getBoundingClientRect(),
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

import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

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
