import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { clientUtils } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";
import { getCurrentUrl } from "./getCurrentUrl";

export type Request = RouterInputs["note"]["fetchHighlights"];
export type Response = RouterOutputs["note"]["fetchHighlights"];

const handler: PlasmoMessaging.MessageHandler<Request, Response> = async (
  req,
  res,
) => {
  const response = await clientUtils.note.fetchHighlights.fetch({
    url: req.body?.url ?? "",
  });
  res.send(response);
};

export async function fetchHighlights() {
  const currentUrl = await getCurrentUrl();
  if (!currentUrl) return [];

  const res = await sendToBackground<Request, Response>({
    name: "fetchHighlights",
    body: {
      url: currentUrl,
    },
  });

  return res;
}

export default handler;
