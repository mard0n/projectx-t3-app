import { type PlasmoMessaging, sendToBackground } from "@plasmohq/messaging";

export type Request = { fullFileName: string };
export type Response = { url: string } | null;

const handler: PlasmoMessaging.MessageHandler<Request, Response> = async (
  req,
  res,
) => {
  const { fullFileName } = req.body ?? {};

  if (!fullFileName) res.send(null);

  try {
    // TODO Handle All fetching and sending errors
    const response = await fetch(
      `${process.env.PLASMO_PUBLIC_BASE_URL}/api/getPreSignedUrl?fileFullName=${fullFileName}`,
    );
    const data = (await response.json()) as { url: string };

    if (data?.url) {
      res.send({ url: data.url });
    }
  } catch (error) {}
  res.send(null);
};

export async function getPreSignedUrl(req: Request) {
  const res = await sendToBackground<Request, Response>({
    name: "getPresignedUrl",
    body: req,
  });
  return res;
}

export default handler;
