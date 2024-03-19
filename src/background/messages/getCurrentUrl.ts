import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";
import { isLinkYoutube } from "~/utils/extension/youtube";

export type ReqGetCurrentUrl = object;
export type ResGetCurrentUrl = string | undefined;

export const extractUrlWithoutQueryParams = (url: string) => {
  const urlObj = new URL(url);
  let urlWithoutQueryParams = `${urlObj.origin}${urlObj.pathname}`;
  const isYoutube = isLinkYoutube(url);
  if (isYoutube) {
    // TODO make it more robust.
    urlWithoutQueryParams =
      urlWithoutQueryParams + "?v=" + urlObj.searchParams.get("v");
  }
  return urlWithoutQueryParams;
};

const handler: PlasmoMessaging.MessageHandler<
  ReqGetCurrentUrl,
  ResGetCurrentUrl
> = async (req, res) => {
  const queryOptions = { active: true, currentWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);
  res.send(tab?.url);
};

export async function getCurrentUrl() {
  const res = await sendToBackground<ReqGetCurrentUrl, ResGetCurrentUrl>({
    name: "getCurrentUrl",
  });

  if (res) {
    return extractUrlWithoutQueryParams(res);
  } else {
    if (window?.location?.href) {
      return extractUrlWithoutQueryParams(window.location.href);
    }
  }
}

export default handler;
