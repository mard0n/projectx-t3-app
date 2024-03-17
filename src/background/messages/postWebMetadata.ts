import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { client, clientUtils } from "..";
import type { RouterInputs, RouterOutputs } from "~/utils/api";

type Request = RouterInputs["webMetadata"]["postWebMetadata"];
type Response = RouterOutputs["webMetadata"]["postWebMetadata"];

const handler: PlasmoMessaging.MessageHandler<Request, Response> = async (
  req,
  res,
) => {
  if (!req.body) return;
  await client.webMetadata.postWebMetadata.mutate(req.body);
  await clientUtils.webMetadata.fetchWebMetadata.refetch();
};

export async function postWebMetadata(update: Request) {
  const res = await sendToBackground<Request, Response>({
    name: "postWebMetadata",
    body: update,
  });
  return res;
}

export default handler;
