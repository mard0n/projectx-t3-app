import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { client } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";
import type { UnwrapArray } from "~/utils/types";

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

type Update = UnwrapArray<Request>;

export async function postWebAnnotation(update: Update) {
  const res = await sendToBackground<Request, Response>({
    name: "postWebAnnotation",
    body: [update],
  });

  return res;
}

export default handler;
