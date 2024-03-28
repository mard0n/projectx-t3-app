import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { clientUtils } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";
import { getCurrentUrl } from "./getCurrentUrl";
import { postWebMetadata } from "./postWebMetadata";

export type Request = RouterInputs["webMetadata"]["fetchWebMetadata"];
export type Response = RouterOutputs["webMetadata"]["fetchWebMetadata"];

const handler: PlasmoMessaging.MessageHandler<Request, Response> = async (
  req,
  res,
) => {
  const response = await clientUtils.webMetadata.fetchWebMetadata.ensureData({
    url: req.body?.url ?? "",
  });
  res.send(response);
};

export async function preFetchWebMetadata() {
  const currentUrl = await getCurrentUrl();

  if (!currentUrl) return;
  await sendToBackground<Request, Response>({
    name: "fetchWebMetadata",
    body: {
      url: currentUrl,
    },
  });
}


export async function fetchWebMetadata() {
  const currentUrl = await getCurrentUrl();

  if (!currentUrl) return;

  const res = await sendToBackground<Request, Response>({
    name: "fetchWebMetadata",
    body: {
      url: currentUrl,
    },
  });
  let webMetadata = res;
  if (!webMetadata) {
    const defaultNoteId = crypto.randomUUID();

    const newWebMetadata = {
      webUrl: currentUrl,
      defaultNoteId: defaultNoteId,
      isTitleAdded: false,
    };
    void postWebMetadata(newWebMetadata);

    webMetadata = newWebMetadata;
  }

  return webMetadata;
}

export default handler;
