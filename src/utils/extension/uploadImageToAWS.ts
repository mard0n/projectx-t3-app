import { getPreSignedUrl } from "../../background/messages/getPresignedUrl";

export async function uploadImageToAWS(image: Blob) {
  const file = new File([image], crypto.randomUUID(), {
    lastModified: new Date().getTime(),
    type: "image/jpeg",
  });
  const filename = file.name;
  const fileType = "jpeg";
  const fullFileName = `${filename}.${fileType}`;

  const res = await getPreSignedUrl({ fullFileName });
  if (!res?.url) return;

  await fetch(res.url, {
    method: "PUT",
    body: image,
  });
  return `${process.env.PLASMO_PUBLIC_CLOUDFRONT_BASE_URL}/${fullFileName}`;
}
