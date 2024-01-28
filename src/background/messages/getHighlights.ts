import type { PlasmoMessaging } from "@plasmohq/messaging";

export type FetchHighlightsReq = object;
export type FetchHighlightsRes = { res: string };

const handler: PlasmoMessaging.MessageHandler<
  FetchHighlightsReq,
  FetchHighlightsRes
> = async (req, res) => {
  // const response = await fetch("http://localhost:3000/api/post.get-all");
  // const json = (await response.json()) as { id: string; name: string }[];
  // console.log("response", response);
  // console.log("response.body", response.body);
  // console.log("json", json);

  res.send({
    res: "success",
  });
};

export default handler;
