import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { client } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";
import type { SerializedBlockRemarkNode } from "~/nodes/BlockRemark";

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

export async function createRemarkPost(remark: SerializedBlockRemarkNode) {
  const newRemarkUpdate = [
    {
      updateType: "created" as const,
      updatedBlockId: remark.id,
      updatedBlock: remark,
    },
  ];
  console.log("newRemarkUpdate", newRemarkUpdate);

  const res = await sendToBackground<Request, Response>({
    name: "postRemark",
    body: newRemarkUpdate,
  });
  return res;
}

export async function deleteRemarkPost(remarkId: string) {
  const newRemarkUpdate = [
    {
      updateType: "destroyed" as const,
      updatedBlockId: remarkId,
      updatedBlock: null,
    },
  ];
  const res = await sendToBackground<Request, Response>({
    name: "postRemark",
    body: newRemarkUpdate,
  });
  return res;
}

export async function updateRemarkPost(remark: SerializedBlockRemarkNode) {
  const newRemarkUpdate = [
    {
      updateType: "updated" as const,
      updatedBlockId: remark.id,
      updatedBlock: remark,
    },
  ];
  const res = await sendToBackground<Request, Response>({
    name: "postRemark",
    body: newRemarkUpdate,
  });

  return res;
}

export default handler;
