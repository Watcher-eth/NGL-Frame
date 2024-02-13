import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  getPreviousFrame,
  useFramesReducer,
  validateActionSignature,
} from "frames.js/next/server";
import Link from "next/link";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { shuffleArray, getRandomNumber } from "../utils";
import { generateConfirmationImage } from "../generateConfirmationImage";
import {
  FollowResponseUser,
  User,
} from "@neynar/nodejs-sdk/build/neynar-api/v1";
import { shareAnswer } from "../ShareAnswer";
import { GetPollsResponse, getPolls, setVote } from "../datastore";
import {
  State,
  sessionStateAnswerType,
  sessionStateQuestionType,
} from "../types";
import { randomUUID, randomInt } from "crypto";
import { generatePreviewImage } from "../generate-question";
import { generateAnswerImage } from "../generateAnswerConfirmation copy";
let questions: GetPollsResponse[];
let rishId: number;
let allFollowers: any[];
let answers: string;
const initialState = {
  pollId: "",
  step: 1,
};

let sessionState: sessionStateQuestionType;
let answerState: sessionStateAnswerType;

sessionState = {
  user: "",
  question: "",
};

answerState = {
  user: "",
  answer: "",
  question: "",
};
const reducer: FrameReducer<State> = (state, action) => {
  const buttonIndex = action.postBody?.untrustedData.buttonIndex;
  //console.log("ACTION ", action);
  //TODO: SHUFFLE NO ADD

  return {
    pollId: state.pollId,
    uuid: randomUUID(),
    step: buttonIndex === 4 ? state.step : state.step + 1,
  };
};

// This is a react server component only
export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const previousFrame = getPreviousFrame<State>(searchParams);
  const validMessage = await validateActionSignature(previousFrame.postBody);

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    { ...initialState, uuid: randomUUID() },
    previousFrame
  );

  //Images
  let firstImage: string;
  let secondImage: string;
  let thirdImage: string;

  //CHECK if question or answer
  const url = previousFrame?.postBody?.untrustedData.url!;
  const parts = url.split("/"); // This splits the URL string into an array of parts
  const urlFid = parts[parts.length - 1];
  const userFid = previousFrame?.postBody?.untrustedData?.fid;
  const isCreator = urlFid === userFid;

  firstImage = await generatePreviewImage(validMessage!, urlFid!);

  //If question get input
  //Create your own and share
  if (!isCreator && sessionState.question.length > 0) {
    secondImage = await generateConfirmationImage(
      validMessage!,
      state.pollId!,
      urlFid!,
      sessionState.question
    );
  }
  //TODO: after second step store question
  if (!isCreator && sessionState.question.length > 0 && state.step === 3) {
    thirdImage = await generatePreviewImage(validMessage!, String(userFid!));
  }

  //If answer get questions
  if (isCreator && state.step === 2) {
    secondImage = await generateAnswerImage(validMessage!, urlFid!);
  }
  //TODO: GET QUESTIONS AND SHUFFLE
  //TODO: after second step store answer and question
  if (isCreator && answerState.answer.length > 0 && state.step === 3) {
    thirdImage = await shareAnswer(
      validMessage!,
      answerState.answer,
      answerState.question
    );
  }

  function getImage() {
    if (state.step === 1) {
      const encodedConf = encodeURIComponent(firstImage!)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");

      const confSVG = `data:image/svg+xml,${encodedConf}`;
      return confSVG;
    }

    if (state.step === 2) {
      const encodedConf = encodeURIComponent(secondImage!)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");

      const confSVG = `data:image/svg+xml,${encodedConf}`;
      return confSVG;
    }

    if (state.step === 3) {
      const encodedConf = encodeURIComponent(thirdImage!)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");

      const confSVG = `data:image/svg+xml,${encodedConf}`;
      return confSVG;
    }

    return "/images/GasFramePreview.png";
  }
  const image = getImage();

  return (
    <div>
      What are you doing here?. <Link href="/debug">Debug</Link>
      <FrameContainer
        postUrl="/frames"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage src={image} />
        {state.step === 1 && !isCreator ? (
          <FrameInput text="Ask me anything" />
        ) : null}
        {state.step === 1 && isCreator ? (
          <FrameButton onClick={dispatch}>See your questions</FrameButton>
        ) : (
          <FrameButton onClick={dispatch}>Answer</FrameButton>
        )}
        {state.step === 2 && isCreator ? (
          <FrameInput text="Your answer..." />
        ) : null}
        {state.step === 2 && !isCreator ? (
          <FrameButton onClick={dispatch}>Next question</FrameButton>
        ) : null}
        {state.step === 2 && isCreator ? (
          <FrameButton onClick={dispatch}>Get your own AMA link</FrameButton>
        ) : (
          <FrameButton onClick={dispatch}>Confirm Answer</FrameButton>
        )}
        {state.step === 3 && isCreator ? (
          <FrameButton href={"http://tinyurl.com/4sv38u6c"}>
            Share your AMA with your friends
          </FrameButton>
        ) : (
          <FrameButton href={"http://tinyurl.com/4sv38u6c"}>
            Share your answer
          </FrameButton>
        )}
      </FrameContainer>
    </div>
  );
}
