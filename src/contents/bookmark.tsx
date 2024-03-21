import { type PlasmoCSConfig } from "plasmo";
import { useState } from "react";
import { fetchBookmarks } from "~/background/messages/fetchBookmarks";
import { fetchWebMetadata } from "~/background/messages/fetchWebMetadata";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import { getTabTitle } from "~/background/messages/getTabTitle";
import { postBookmark } from "~/background/messages/postBookmark";
import {
  BLOCK_LINK_TYPE,
  type SerializedBlockLinkNode,
} from "~/nodes/BlockLink";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  exclude_matches: ["http://localhost:3000/*"],
  all_frames: true,
  run_at: "document_idle",
};

const createBookmarkData = async () => {
  const currentUrl = await getCurrentUrl();
  const tabTitle = await getTabTitle();
  const webMetadata = await fetchWebMetadata();
  if (!tabTitle || !currentUrl || !webMetadata) return;

  const remarkId = crypto.randomUUID();

  // TODO: need to figure out ways to sync this data and BlockRemarkParagraph or easier way to create data
  const newBlockLink: SerializedBlockLinkNode = {
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
      title: tabTitle,
      linkUrl: currentUrl,
      linkAlt: currentUrl,
    },
  };
  return newBlockLink;
};

function Bookmark() {
  const [showAlert, setShowAlert] = useState<
    "success" | "already-exists" | null
  >(null);

  const handleBookmark = () => {
    void (async () => {
      const bookmark = await fetchBookmarks();
      if (bookmark) {
        setShowAlert("already-exists");
        return;
      }
      const newBookmark = await createBookmarkData();
      if (!newBookmark) return;

      const newBookmarkUpdate = [
        {
          updateType: "created" as const,
          updatedBlockId: newBookmark.id,
          updatedBlock: newBookmark,
        },
      ];
      void postBookmark(newBookmarkUpdate);

      setShowAlert("success");

      // TODO Revent saving if it's already saved
      // TODO stop timer/start over when component is hovered
      // TODO Adding comment/note (permanent/linked or one time like just text)
    })();
  };
  return (
    <>
      <button onClick={handleBookmark}>Bookmark</button>
      {showAlert === "success" ? (
        <div>
          Success<span>x</span>
        </div>
      ) : showAlert === "already-exists" ? (
        <div>
          Already exist<span> x </span>
        </div>
      ) : null}
    </>
  );
}

export default Bookmark;
