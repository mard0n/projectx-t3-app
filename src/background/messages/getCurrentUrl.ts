import type { PlasmoMessaging } from "@plasmohq/messaging";

export type ReqGetCurrentUrl = object;
export type ResGetCurrentUrl = string | undefined;

const handler: PlasmoMessaging.MessageHandler<
  ReqGetCurrentUrl,
  ResGetCurrentUrl
> = async (req, res) => {
  const queryOptions = { active: true, lastFocusedWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);

  res.send(tab?.url);
};

export default handler;
