import * as fs from "fs";
import { join } from "path";
import satori from "satori";
import { FrameActionMessage } from "@farcaster/core";
import { colors } from "./consts";
import { questionsAndIcons } from "./consts";
import { darkenColor, getRandomNumber } from "./utils";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { Question } from "./datastore";
import "./globals.css";
import { getRandomColor } from "./generate-question";
const interRegPath = join(process.cwd(), "public/Qilka.otf");
let interReg = fs.readFileSync(interRegPath);

// Message should contain poll no
export async function generateAnswerImage(
  userFid: string,
  answer: string,
  question: Question
) {
  //console.log("SUBMISSION MESSAGE ", validMessage);

  // @ts-ignore
  const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);
  const user = await client.lookupUserByFid(Number("5"));

  let userName = user ? user.result.user.displayName : "Jesse";
  let userPFP = user ? user.result.user.pfp.url : "";

  const randomColor = getRandomColor();
  const darkerHex = darkenColor(randomColor, 30); // Darken by reducing each component by 30

  const imageSvg = await satori(
    <div
      style={{
        display: "flex", // Use flex layout
        flexDirection: "row", // Align items horizontally
        alignItems: "stretch", // Stretch items to fill the container height
        width: "100%",
        height: "100vh",
        padding: "0px 10px", // Full viewport height
        backgroundColor: randomColor,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          margin: "32px auto",
          padding: "3.8rem 2rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: "3rem",
            color: darkerHex,
            padding: "0 5rem",
            textAlign: "center",
          }}
        >
          {question.question}
        </div>
        <div style={{ fontSize: "5rem", color: "white", textAlign: "center" }}>
          {answer}
        </div>
        <div tw="flex items-center space-x-2">
          <img tw="w-[3.3rem] h-[3.3rem] rounded-full mr-5" src={userPFP} />{" "}
          <div
            style={{
              fontSize: "2.8rem",
              color: darkerHex,
            }}
          >
            {userName}
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
