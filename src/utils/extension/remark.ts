import { fetchWebMetadata } from "~/background/messages/fetchWebMetadata";
import { getCurrentUrl } from "~/background/messages/getCurrentUrl";
import {
  type SerializedBlockRemarkNode,
  BLOCK_REMARK_TYPE,
} from "~/nodes/BlockRemark";
import type { RectType } from "./highlight";

export const createRemarkData = async (remarkRect: RectType) => {
  const currentUrl = await getCurrentUrl();
  if (!currentUrl) return;

  const remarkId = crypto.randomUUID();

  const webMetadata = await fetchWebMetadata();
  if (!webMetadata) return;

  // const indexWithinParent = await getIndexWithinHighlightsAndScreenshots(remarkRect.y);

  // TODO: need to figure out ways to sync this data and BlockRemarkParagraph or easier way to create data
  const newRemark: SerializedBlockRemarkNode = {
    type: BLOCK_REMARK_TYPE,
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
      remarkText: "",
      remarkRect: remarkRect,
    },
  };
  return newRemark;
};
