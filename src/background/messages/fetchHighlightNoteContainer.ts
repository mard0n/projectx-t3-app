import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { clientUtils } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";

export type Request = RouterInputs["note"]["fetchHighlightNoteContainer"];
export type Response = RouterOutputs["note"]["fetchHighlightNoteContainer"];

const handler: PlasmoMessaging.MessageHandler<null, Response> = async (
  req,
  res,
) => {
  const [tab] = await chrome.tabs.query({ active: true });
  const currentUrl = tab?.url;
  const response = await clientUtils.note.fetchHighlightNoteContainer.ensureData({
    url: currentUrl ?? "",
  });
  res.send(response);
};

export async function fetchHighlightNoteContainer() {
  const res = await sendToBackground<Request, Response>({
    name: "fetchHighlightNoteContainer",
  });

  return res;
}

export default handler;
