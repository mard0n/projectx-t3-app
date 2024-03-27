import {
  Button,
  CssVarsProvider,
  GlobalStyles,
  Snackbar,
  type SnackbarOrigin,
} from "@mui/joy";
import { type PlasmoCSConfig } from "plasmo";
import { useEffect, useState } from "react";
import { fetchBookmarks } from "~/background/messages/fetchBookmarks";
import { fetchWebMetadata } from "~/background/messages/fetchWebMetadata";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { getTabData } from "~/background/messages/getTabTitle";
import {
  BLOCK_LINK_TYPE,
  type SerializedBlockLinkNode as BookmarkType,
} from "~/nodes/BlockLink";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { useStorage } from "@plasmohq/storage/hook";
import { listenContentScriptTriggers } from "~/utils/extension";
import { postWebAnnotation } from "~/background/messages/postWebAnnotation";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  // matches: ["http://google.com/*"],
  exclude_matches: ["http://localhost:3000/*"],
  all_frames: true,
  run_at: "document_idle",
};

const createBookmarkData = async () => {
  const currentUrl = await getCurrentUrl();
  const tab = await getTabData();
  const webMetadata = await fetchWebMetadata();
  if (!tab.title || !currentUrl || !webMetadata) return;

  const remarkId = crypto.randomUUID();

  // TODO: need to figure out ways to sync this data and BlockRemarkParagraph or easier way to create data
  const newBlockLink: BookmarkType = {
    type: BLOCK_LINK_TYPE,
    id: remarkId,
    parentId: webMetadata.defaultNoteId,
    indexWithinParent: 0,
    open: true,
    version: 1,
    childBlocks: [],
    children: [],
    format: "",
    indent: 0,
    direction: null,
    webUrl: currentUrl,
    properties: {
      linkType: "block-link-bookmark", // TODO Check why enum didn't work
      title: tab.title,
      desc: tab.description,
      linkUrl: currentUrl,
      linkAlt: currentUrl,
      commentText: "",
    },
  };
  return newBlockLink;
};

interface SnackState extends SnackbarOrigin {
  open: boolean;
  text: string;
}

function Bookmark() {
  const { data: bookmark } = useQuery({
    queryKey: ["fetchBookmarks"],
    queryFn: fetchBookmarks,
  });

  const createfetchBookmarksQuery = useMutation({
    mutationFn: (bookmark: BookmarkType) => {
      return postWebAnnotation({
        updateType: "created" as const,
        updatedBlockId: bookmark.id,
        updatedBlock: bookmark,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["fetchBookmarks"] });
    },
  });
  const updatefetchBookmarksQuery = useMutation({
    mutationFn: (bookmark: BookmarkType) => {
      return postWebAnnotation({
        updateType: "updated" as const,
        updatedBlockId: bookmark.id,
        updatedBlock: bookmark,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchBookmarks"] }),
  });
  const deletefetchBookmarksQuery = useMutation({
    mutationFn: (bookmarkId: string) => {
      return postWebAnnotation({
        updateType: "destroyed" as const,
        updatedBlockId: bookmarkId,
        updatedBlock: null,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchBookmarks"] }),
  });

  useEffect(() => {
    // prefetching. to increase the performance
    void fetchWebMetadata();
  }, []);

  useStorage<boolean>("bookmark-init", () => true);

  const [snackState, setSnackState] = useState<SnackState>({
    open: false,
    vertical: "top",
    horizontal: "right",
    text: "",
  });

  const { open, vertical, horizontal } = snackState;

  const handleClose = () => {
    setSnackState({ ...snackState, open: false });
  };
  const handleDelete = () => {
    if (bookmark?.id) {
      deletefetchBookmarksQuery.mutate(bookmark.id);
      setSnackState({ ...snackState, open: false });
    }
  };

  useEffect(() => {
    const handleBookmark = () => {
      void (async () => {
        if (bookmark) {
          setSnackState({
            ...snackState,
            open: true,
            text: "Page is already saved",
          });
          return;
        }
        const newBookmark = await createBookmarkData();
        if (!newBookmark) return;

        createfetchBookmarksQuery.mutate(newBookmark);

        setSnackState({ ...snackState, open: true, text: "Page is saved" });

        // TODO stop timer/start over when component is hovered
        // TODO Adding comment/note (permanent/linked or one time like just text)
      })();
    };

    listenContentScriptTriggers((type) => {
      if (type === "bookmark") {
        void handleBookmark();
      }
    });

    const handleKeypress = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyB") {
        void handleBookmark();
      }
    };
    document.addEventListener("keypress", handleKeypress);
    return () => {
      document.removeEventListener("keypress", handleKeypress);
    };
  }, [bookmark]);

  return (
    <Snackbar
      anchorOrigin={{ vertical, horizontal }}
      open={open}
      onClose={handleClose}
      endDecorator={
        bookmark?.id ? (
          <Button
            onClick={handleDelete}
            size="sm"
            variant="outlined"
            color="danger"
          >
            Delete
          </Button>
        ) : null
      }
    >
      {snackState.text}
    </Snackbar>
  );
}

const queryClient = new QueryClient();
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
          <Bookmark />
        </CssVarsProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
};

export default Wrapper;
