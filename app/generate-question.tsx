import * as fs from "fs";
import { join } from "path";
import satori from "satori";
import { FrameActionMessage } from "@farcaster/core";
import { colors } from "./consts";
import { questionsAndIcons } from "./consts";
import { getRandomNumber } from "./utils";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
const interRegPath = join(process.cwd(), "public/LilitaOne-Regular.ttf");
let interReg = fs.readFileSync(interRegPath);
export function getRandomColor() {
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}

// Message should contain poll no
export async function generatePreviewImage(userFid: string) {
  const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY!);

  const answerProfile = await client.lookupUserByFid(Number(userFid));

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
              height: "22rem",
              width: "22rem",
              borderRadius: "100%",
              marginRight: "1rem",
              marginLeft: "9rem",
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
          }}
        >
          <div
            style={{
              fontSize: "10rem",

              color: "black",
              lineHeight: "9rem",
              marginBottom: "1.5rem",
            }}
          >
            Ask me anything
          </div>
          <div style={{ fontSize: "3.2rem", color: "darkgray" }}>
            [Anonymously]
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
