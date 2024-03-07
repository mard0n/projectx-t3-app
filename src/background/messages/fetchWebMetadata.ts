import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { clientUtils } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";

export type Request = RouterInputs["note"]["fetchWebmeta"];
export type Response = RouterOutputs["note"]["fetchWebmeta"];

const handler: PlasmoMessaging.MessageHandler<null, Response> = async (
  req,
  res,
) => {
  const [tab] = await chrome.tabs.query({ active: true });
  const currentUrl = tab?.url;
  const response = await clientUtils.note.fetchWebmeta.ensureData({
    url: currentUrl ?? "",
  });
  res.send(response);
};

export async function fetchWebMetadata() {
  const res = await sendToBackground<Request, Response>({
    name: "fetchWebMetadata",
  });

  return res;
}

export default handler;
