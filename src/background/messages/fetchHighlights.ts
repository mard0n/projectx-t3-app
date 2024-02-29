import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { clientUtils } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";

export type Request = RouterInputs["note"]["fetchHighlights"];
export type Response = RouterOutputs["note"]["fetchHighlights"];

const handler: PlasmoMessaging.MessageHandler<null, Response> = async (
  req,
  res,
) => {
  const [tab] = await chrome.tabs.query({ active: true });
  const currentUrl = tab?.url;
  const response = await clientUtils.note.fetchHighlights.ensureData({
    url: currentUrl ?? "",
  });
  res.send(response);
};

export async function fetchHighlights() {
  const res = await sendToBackground<Request, Response>({
    name: "fetchHighlights",
  });

  return res;
}

export default handler;
