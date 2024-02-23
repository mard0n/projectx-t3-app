import { sendToBackground, type PlasmoMessaging } from "@plasmohq/messaging";

export type ReqGetCurrentUrl = object;
export type ResGetCurrentUrl = string | undefined;

export const extractUrlWithoutQueryParams = (url: string) => {
  const urlObj = new URL(url);
  let urlWithoutQueryParams = `${urlObj.origin}${urlObj.pathname}`;
  const isYoutube = urlObj.origin.includes("youtube");
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
  const queryOptions = { active: true };
  const [tab] = await chrome.tabs.query(queryOptions);
  if (tab?.url) {
    const urlWithoutQueryParams = extractUrlWithoutQueryParams(tab?.url);

    res.send(urlWithoutQueryParams);
  } else {
    res.send("");
  }
};

export async function getCurrentUrl() {
  const res = await sendToBackground<ReqGetCurrentUrl, ResGetCurrentUrl>({
    name: "getCurrentUrl",
  });
  if (res) {
    return res;
  } else {
    if (window?.location?.href) {
      const urlWithoutQueryParams = extractUrlWithoutQueryParams(
        window?.location?.href,
      );
      return urlWithoutQueryParams;
    }
  }
}

export default handler;
