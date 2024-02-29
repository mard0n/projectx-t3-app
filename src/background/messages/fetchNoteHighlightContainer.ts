import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { clientUtils } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";

export type Request = RouterInputs["note"]["fetchNoteHighlightContainer"];
export type Response = RouterOutputs["note"]["fetchNoteHighlightContainer"];

const handler: PlasmoMessaging.MessageHandler<null, Response> = async (
  req,
  res,
) => {
  const [tab] = await chrome.tabs.query({ active: true });
  const currentUrl = tab?.url;
  const response =
    await clientUtils.note.fetchNoteHighlightContainer.ensureData({
      url: currentUrl ?? "",
    });
  res.send(response);
};

export async function fetchNoteHighlightContainer() {
  const res = await sendToBackground<Request, Response>({
    name: "fetchNoteHighlightContainer",
  });

  return res;
}

export default handler;
