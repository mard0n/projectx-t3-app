import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { client } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";
import type { SerializedBlockHighlightNode } from "~/nodes/BlockHighlight";

type Request = RouterInputs["note"]["saveChanges"];
type Response = RouterOutputs["note"]["saveChanges"];

const handler: PlasmoMessaging.MessageHandler<Request, Response> = async (
  req,
  res,
) => {
  if (!req.body) return;
  const response = await client.note.saveChanges.mutate(req.body);
  res.send(response);
};

export async function createHighlightPost(
  highlight: SerializedBlockHighlightNode,
) {
  const newHighlightUpdate = [
    {
      updateType: "created" as const,
      updatedBlockId: highlight.id,
      updatedBlock: highlight,
    },
  ];
  const res = await sendToBackground<Request, Response>({
    name: "postHighlight",
    body: newHighlightUpdate,
  });
  return res;
}

export async function deleteHighlightPost(highlightId: string) {
  const newHighlightUpdate = [
    {
      updateType: "destroyed" as const,
      updatedBlockId: highlightId,
      updatedBlock: null,
    },
  ];
  const res = await sendToBackground<Request, Response>({
    name: "postHighlight",
    body: newHighlightUpdate,
  });
  return res;
}

export async function updateHighlightPost(
  highlight: SerializedBlockHighlightNode,
) {
  const newHighlightUpdate = [
    {
      updateType: "updated" as const,
      updatedBlockId: highlight.id,
      updatedBlock: highlight,
    },
  ];
  const res = await sendToBackground<Request, Response>({
    name: "postHighlight",
    body: newHighlightUpdate,
  });
  return res;
}

export default handler;
