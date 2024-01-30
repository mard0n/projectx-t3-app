import { Storage } from "@plasmohq/storage";
import type { SerializedBlockHighlightSliceNode } from "~/nodes/BlockHighlightSlice/BlockHighlightSliceNode";

const storage = new Storage({ area: "local" });

export async function saveCommentHighlightsToStorage(
  highlight: SerializedBlockHighlightSliceNode,
) {
  const highlightComments = await getCommentHighlights();

  await storage.set("saveHightlightComment", [...highlightComments, highlight]);
}

export async function getCommentHighlights() {
  const highlightComments: SerializedBlockHighlightSliceNode[] =
    (await storage.get("saveHightlightComment")) ?? [];

  return highlightComments;
}
