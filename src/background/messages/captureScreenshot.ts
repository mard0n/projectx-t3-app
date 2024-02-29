import { type PlasmoMessaging, sendToBackground } from "@plasmohq/messaging";

export type Request = null;
export type Response = string | null;

const handler: PlasmoMessaging.MessageHandler<Request, Response> = async (
  req,
  res,
) => {
  chrome.tabs
    .captureVisibleTab()
    .then((image) => {
      // image is base64
      res.send(image);
    })
    .catch((err) => {
      console.error("err", err);
      res.send(null);
    });
};

export async function captureScreenshot() {
  const res = await sendToBackground<Request, Response>({
    name: "captureScreenshot",
  });
  return res;
}

export default handler;
