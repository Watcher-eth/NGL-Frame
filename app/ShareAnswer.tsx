import * as fs from "fs";
import { join } from "path";
import satori from "satori";
import { FrameActionMessage } from "@farcaster/core";
import { colors } from "./consts";
import { questionsAndIcons } from "./consts";
import { getRandomNumber } from "./utils";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import "./globals.css";
import { getAnswer } from "./datastore";
const interRegPath = join(process.cwd(), "public/Qilka.otf");
let interReg = fs.readFileSync(interRegPath);

// Message should contain poll no
export async function shareAnswer(
  validMessage: FrameActionMessage,
  questionID: string
) {
  //TODO: GET from URL
  let questionId = questionID.length > 0 ? questionID : "";
  //console.log("SUBMISSION MESSAGE ", validMessage);
  const fid = validMessage?.data.fid;

  // @ts-ignore
  const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);
  const user = await client.lookupUserByFid(fid);

  let userName = user ? user.result.user.displayName : "Jesse";
  let userPFP = user ? user.result.user.pfp.url : "";
  //console.log(fid.toString());
  let answer: string;
  let question: string;

  //Get answer
  getAnswer(questionId).then((response) => {
    answer = response?.answerText!;
    question = response?.question!;
  });

  const imageSvg = await satori(
    <div
      style={{
        display: "flex", // Use flex layout
        flexDirection: "row", // Align items horizontally
        alignItems: "stretch", // Stretch items to fill the container height
        width: "100%",
        height: "100vh",
        padding: "0px 10px", // Full viewport height
        backgroundColor: "whitesmoke",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          margin: "32px auto",
          padding: "24px",
          width: "98%",
          backgroundColor: "white",
          borderRadius: "0.5rem",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",

            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <img
            style={{
              height: "3.3rem",
              width: "3.3rem",
              borderRadius: "100%",
              marginRight: "0.3rem",
            }}
            src={userPFP}
          />
          <h1
            style={{
              fontSize: "1.85rem",
              fontWeight: "600",
              color: "#1a202c",
            }}
          >
            {userName}&apos;s compliments
          </h1>
        </div>
        {answer! ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          ></div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              height: "12rem",
              padding: "9rem 0",
              alignSelf: "center",
            }}
          >
            <div
              className="rainbow_text_animated"
              style={{
                fontSize: "3rem", // Adjusted to match .rainbow
                textAlign: "center",

                letterSpacing: "5px",
              }}
            >
              No compliments yet
            </div>
          </div>
        )}
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
