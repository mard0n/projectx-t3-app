import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { client } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";

type Request = RouterInputs["note"]["saveChanges"];
type Response = RouterOutputs["note"]["saveChanges"];

const handler: PlasmoMessaging.MessageHandler<Request, Response> = async (
  req,
  res,
) => {
  if (!req.body) return;
  const response = await client.note.saveChanges.mutate(req.body);
  console.log("response", response);
};

export async function saveHighlight(highlight: Request) {
  const res = await sendToBackground<Request, Response>({
    name: "saveHighlight",
    body: highlight,
  });
  return res;
}

export default handler;
