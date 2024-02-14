import * as fs from "fs";
import { join } from "path";
import satori from "satori";
import { FrameActionMessage } from "@farcaster/core";
import { colors } from "./consts";
import { questionsAndIcons } from "./consts";
import { darkenColor, getRandomNumber, issueVcs } from "./utils";
import { getRandomColor } from "./generate-question";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
const interRegPath = join(process.cwd(), "public/Qilka.otf");
let interReg = fs.readFileSync(interRegPath);

// Message should contain poll no
export async function generateConfirmationImage(question: string) {
  //const address = validMessage.data.

  const randomColor = getRandomColor();
  const darkerHex = darkenColor(randomColor, 30); // Darken by reducing each component by 30

  const imageSvg = await satori(
    <div
      style={{
        display: "flex", // Use flex layout
        flexDirection: "row", // Align items horizontally
        alignItems: "stretch", // Stretch items to fill the container height
        width: "100%",
        height: "100vh", // Full viewport height
        backgroundColor: randomColor,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 24,
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "5rem 0 0 0",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 80,
              fontWeight: "bold",
              padding: "0 1rem",
              lineHeight: "5.5rem",
              textAlign: "center",
            }}
          >
            {question !== undefined ? question : "No questions yet..."}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 50,
              fontWeight: "bold",
              padding: "1rem 1rem ",
              textAlign: "center",
              color: darkerHex,
            }}
          >
            {question !== undefined ? "[anon]" : "Let your frens know"}
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
