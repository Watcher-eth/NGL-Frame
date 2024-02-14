import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  getPreviousFrame,
  useFramesReducer,
  validateActionSignature,
  getFrameMessage,
} from "frames.js/next/server";
import Link from "next/link";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { generateConfirmationImage } from "./generateConfirmationImage";
import {
  FollowResponseUser,
  User,
} from "@neynar/nodejs-sdk/build/neynar-api/v1";
import { shareAnswer } from "./ShareAnswer";
import { Question, getQuestions, setAnswer, setQuestion } from "./datastore";
import {
  State,
  sessionStateAnswerType,
  sessionStateQuestionType,
} from "./types";
import { randomUUID, randomInt } from "crypto";
import { generatePreviewImage } from "./generate-question";
import { generateAnswerImage } from "./generateAnswerConfirmation copy";
import {
  kvDeleteSession,
  kvGetSession,
  kvSetSession,
  sessionStateType,
} from "./sessionStore";
import { shuffleArray } from "./utils";
let questions: Question[];
let rishId: number;
let allFollowers: any[];
let answers: string;
const initialState = {
  pollId: "",
  step: 1,
};

const reducer: FrameReducer<State> = (state, action) => {
  //console.log("ACTION ", action);
  //TODO: SHUFFLE NO ADD

  return {
    pollId: state.pollId,
    uuid: randomUUID(),
    step: state.step + 1,
  };
};

// This is a react server component only
export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  let rishId: number | undefined;
  let voter: string | undefined;
  //console.log("RENDERING? ////////////////////");
  const previousFrame = getPreviousFrame<State>(searchParams);
  let sessionState: sessionStateType = await kvGetSession(previousFrame);
  if (
    previousFrame &&
    previousFrame.postBody &&
    previousFrame.postBody.untrustedData
  ) {
    rishId = previousFrame.postBody?.untrustedData?.fid;
    voter = String(rishId);
  }
  console.log("PREV FRAME", previousFrame);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    // ...DEBUG_HUB_OPTIONS,
    fetchHubContext: true,
  });
  console.log("GOT FRAME MSG", frameMessage);

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    { ...initialState, uuid: randomUUID() },
    previousFrame
  );
  if (state.step === 1 && sessionState.question.id) {
    kvDeleteSession(previousFrame);
  }

  state.pollId = sessionState.question ? sessionState.question?.id! : "";

  //Images
  let firstImage: string;
  let secondImage: string;
  let thirdImage: string;

  //CHECK if question or answer
  // const url = previousFrame?.postBody?.untrustedData.url!;
  //const parts = url.split("/"); // This splits the URL string into an array of parts
  const urlFid = "1171";
  const userFid = previousFrame?.postBody?.untrustedData?.fid;
  const isCreator = false;
  firstImage = await generatePreviewImage(urlFid); //await generatePreviewImage(urlFid!);

  //If question get input
  //Create your own and share
  if (!isCreator && sessionState.question.question.length > 0) {
    console.log("LOG 2", state.step);
    sessionState.question.question =
      previousFrame.postBody?.untrustedData.inputText!;
    kvSetSession(previousFrame, sessionState);

    secondImage = await generateConfirmationImage(
      sessionState.question.question
    );

    await setQuestion({
      askerId: String(userFid),
      receiverId: String(urlFid),
      questionText: previousFrame.postBody?.untrustedData.inputText!,
    });
  }

  if (
    !isCreator &&
    sessionState.question.question.length > 0 &&
    state.step === 3
  ) {
    thirdImage = await generatePreviewImage(String(userFid!));
  }

  //If answer get questions
  if (isCreator && sessionState.questions.length > 0) {
    sessionState.questions = await getQuestions(String(userFid));
    kvSetSession(previousFrame, sessionState);
  }
  if (isCreator && state.step === 2) {
    sessionState.question = sessionState.questions[0]!;
    console.log("Step 2", sessionState.questions[0]);
    kvSetSession(previousFrame, sessionState);
    secondImage = await generateAnswerImage(
      urlFid,
      "New York, NY",
      sessionState.questions[0]!
    );
  }
  //TODO: GET QUESTIONS AND SHUFFLE
  const shuffleAndDisplayFollowings = () => {
    const shuffled = shuffleArray([...sessionState.questions]); // Create a shallow copy and shuffle
    sessionState.questions = shuffled.slice(0, 4).map((value) => {
      return {
        id: value.id,
        question: value.question,
      };
    });
    console.log("SHUFFLED ?", sessionState.questions);
    // updateSessionState({
    //   rishFollowings: Buffer.from(
    //     JSON.stringify(rishFollowingDecoded)
    //   ).toString("base64url"),
    // });
    kvSetSession(previousFrame, sessionState);
  };

  //TODO: after second step store answer and question
  if (isCreator && sessionState.answer.length < 2 && state.step === 3) {
    sessionState.answer = previousFrame.postBody?.untrustedData.inputText!;
    kvSetSession(previousFrame, sessionState);

    thirdImage = await shareAnswer(frameMessage!, urlFid);
    await setAnswer({
      questionId: sessionState.question.id,
      answerText: sessionState.answer,
    });
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
