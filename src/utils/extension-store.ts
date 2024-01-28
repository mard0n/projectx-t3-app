import { Storage } from "@plasmohq/storage";
import type { SerializedBlockHighlightCommentNode } from "~/nodes/BlockHighlightComment/BlockHighlightCommentNode";

const storage = new Storage({ area: "local" });

export async function saveCommentHighlightsToStorage(
  highlight: SerializedBlockHighlightCommentNode,
) {
  const highlightComments = await getCommentHighlights();

  await storage.set("saveHightlightComment", [...highlightComments, highlight]);
}

export async function getCommentHighlights() {
  const highlightComments: SerializedBlockHighlightCommentNode[] =
    (await storage.get("saveHightlightComment")) ?? [];

  return highlightComments;
}
