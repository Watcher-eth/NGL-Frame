import * as fs from "fs";
import { join } from "path";
import satori from "satori";
import { FrameActionMessage } from "@farcaster/core";
import { colors } from "./consts";
import { questionsAndIcons } from "./consts";
import { getRandomNumber } from "./utils";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import Image from "next/image";
const interRegPath = join(process.cwd(), "public/LilitaOne-Regular.ttf");
let interReg = fs.readFileSync(interRegPath);
const vercelUrl = process.env.VERCEL_URL;
const isVercel = vercelUrl && vercelUrl?.length > 0;

export function getRandomColor() {
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}

// Message should contain poll no
export async function generatePreviewImage(userFid: string) {
  const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY!);

  const answerProfile = await client.lookupUserByFid(Number(userFid));
  const baseUrl = process.env.BASE_URL || "http://localhost:3000"; // Adjust localhost port as necessary

  const imageSvg = await satori(
    <div
      style={{
        display: "flex", // Use flex layout
        flexDirection: "row", // Align items horizontally
        alignItems: "stretch", // Stretch items to fill the container height
        width: "100%",
        height: "100vh", // Full viewport height
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 164,
          paddingRight: 24,
          lineHeight: 1.2,
          fontSize: 36,
          color: "white",
          flex: 1,
          overflow: "hidden",
          fontFamily: "Benzin-Bold",
          marginTop: 24,
        }}
      >
        {answerProfile ? (
          <img
            src={answerProfile.result.user.pfp.url}
            style={{
              objectFit: "cover",
              height: "24rem",
              width: "24rem",
              borderRadius: "100%",
              marginRight: "1rem",
              marginLeft: "10rem",
            }}
          />
        ) : (
          <div
            style={{
              height: "23rem",
              width: "23rem",
              borderRadius: "100%",
              marginRight: "1rem",
              background: "gray",
            }}
          ></div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            paddingLeft: "1.5rem",
            marginTop: "1.2rem",
          }}
        >
          <div
            style={{
              fontSize: "10rem",

              color: "black",
              lineHeight: "8.8rem",
              marginBottom: "1.5rem",
            }}
          >
            Ask me anything
          </div>
          <div
            style={{
              fontSize: "3.2rem",
              color: "darkgray",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div> [Anonymously]</div>

            <img
              src={`${baseUrl}/images/Popdadix.png`}
              style={{ height: "1.9rem", width: "21rem", marginTop: "0.5rem" }}
            />
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1146,
      height: 600,
      fonts: [
        {
          name: "Inter",
          data: interReg,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );

  return imageSvg;
}
