import { type PlasmoMessaging, sendToBackground } from "@plasmohq/messaging";

export type ReqGetCurrentUrl = object;
export type ResGetCurrentUrl = string | undefined;

const handler: PlasmoMessaging.MessageHandler<
  ReqGetCurrentUrl,
  ResGetCurrentUrl
> = async (req, res) => {
  const queryOptions = { active: true, currentWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);

  res.send(tab?.title);
};

export async function getTabData() {
  const title = document.title;
  const description = document
    .querySelector('meta[name="description"]')
    ?.getAttribute("content");

  if (title) {
    return { title, description: description ?? undefined };
  }
  const res = await sendToBackground<ReqGetCurrentUrl, ResGetCurrentUrl>({
    name: "getTabTitle",
  });
  return { title: res };
}

export default handler;
