import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  S3Client,
  PutObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const fileFullName = req.query.fileFullName as string;

  if (!fileFullName || !(typeof fileFullName === "string"))
    res.send({ error: "wrong fileFullName" });

  const creds: S3ClientConfig = {
    region: process.env.S3_REGION ?? "",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
  };
  const client = new S3Client(creds);

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileFullName,
  });

  const url = await getSignedUrl(client, command, { expiresIn: 60 });

  res.status(200).json({
    url: url,
  });
}
