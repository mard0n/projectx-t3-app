import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { client } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";

type Request = RouterInputs["webMetadata"]["updateTitleStatus"];
type Response = RouterOutputs["webMetadata"]["updateTitleStatus"];

const handler: PlasmoMessaging.MessageHandler<Request, Response> = async (
  req,
  res,
) => {
  if (!req.body) return;
  await client.webMetadata.updateTitleStatus.mutate(req.body);
};

export async function updateWebMetadataTitleStatus(update: Request) {
  const res = await sendToBackground<Request, Response>({
    name: "updateWebMetadataTitleStatus",
    body: update,
  });
  return res;
}

export default handler;
