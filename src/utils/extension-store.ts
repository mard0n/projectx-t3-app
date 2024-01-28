import { Storage } from "@plasmohq/storage";

const storage = new Storage({ area: "local" });

export async function saveCommentHighlightsToStorage(highlight: object) {
  const highlightComments = await getCommentHighlights();

  await storage.set("saveHightlightComment", [...highlightComments, highlight]);
}

export async function getCommentHighlights() {
  const highlightComments: object[] =
    (await storage.get("saveHightlightComment")) ?? [];

  return highlightComments;
}
