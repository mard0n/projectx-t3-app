import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { client, clientUtils } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";

type Request = RouterInputs["note"]["saveChanges"];
type Response = RouterOutputs["note"]["saveChanges"];

const handler: PlasmoMessaging.MessageHandler<Request, Response> = async (
  req,
  res,
) => {
  if (!req.body) return;
  await client.note.saveChanges.mutate(req.body);
  await clientUtils.note.fetchHighlights.refetch();
};

export async function sendHighlightToServer(update: Request) {
  const res = await sendToBackground<Request, Response>({
    name: "sendHighlightToServer",
    body: update,
  });
  return res;
}

export default handler;
