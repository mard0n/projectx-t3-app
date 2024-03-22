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
  res.send(response);
};

export async function postYoutube(update: Request) {
  const res = await sendToBackground<Request, Response>({
    name: "postYoutube",
    body: update,
  });
  return res;
}

export default handler;
