import { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
import { generatePreviewImage } from "../generate-question";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userFid } = req.query; // Or get it from req.body, if you're posting data

  try {
    // Generate the SVG image
    const svg = await generatePreviewImage(String(userFid));

    // Convert SVG string to Buffer for Sharp processing
    const svgBuffer = Buffer.from(svg, "utf-8");

    // Convert SVG to JPEG/PNG with Sharp
    const outputFormat = "jpeg"; // or 'png'
    const quality = 80; // Adjust quality
    const convertedImage = await sharp(svgBuffer)
      .toFormat(outputFormat, { quality })
      .toBuffer();

    // Set the correct content type
    res.setHeader("Content-Type", `image/${outputFormat}`);

    // Send the image back
    res.send(convertedImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
