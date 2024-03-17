import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { clientUtils } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";
import { getCurrentUrl } from "./getCurrentUrl";

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

export async function fetchWebMetadata() {
  const currentUrl = await getCurrentUrl();

  if (!currentUrl) return;

  const res = await sendToBackground<Request, Response>({
    name: "fetchWebMetadata",
    body: {
      url: currentUrl,
    },
  });

  return res;
}

export default handler;
