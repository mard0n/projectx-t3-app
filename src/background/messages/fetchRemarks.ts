import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { clientUtils } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";
import { getCurrentUrl } from "./getCurrentUrl";

export type Request = RouterInputs["note"]["fetchRemarks"];
export type Response = RouterOutputs["note"]["fetchRemarks"];

const handler: PlasmoMessaging.MessageHandler<Request, Response> = async (
  req,
  res,
) => {
  const response = await clientUtils.note.fetchRemarks.fetch({
    url: req.body?.url ?? "",
  });
  res.send(response);
};

export async function fetchRemarks() {
  const currentUrl = await getCurrentUrl();
  if (!currentUrl) return [];

  const res = await sendToBackground<Request, Response>({
    name: "fetchRemarks",
    body: {
      url: currentUrl,
    },
  });

  return res;
}

export default handler;
