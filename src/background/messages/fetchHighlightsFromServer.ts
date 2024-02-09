import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { clientUtils } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";

export type Request = RouterInputs["note"]["fetchHighlights"];
export type Response = RouterOutputs["note"]["fetchHighlights"];

const handler: PlasmoMessaging.MessageHandler<Request, Response> = async (
  req,
  res,
) => {
  const response = await clientUtils.note.fetchHighlights.ensureData({
    url: req.body?.url ?? "",
  });
  res.send(response);
};

export async function fetchHighlightsFromServer(req: Request) {
  const res = await sendToBackground<Request, Response>({
    name: "fetchHighlightsFromServer",
    body: req,
  });


  return res;
}

export default handler;
