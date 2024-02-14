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
  const buttonIndex = action.postBody?.untrustedData.buttonIndex;

  const step =
    state.step === 2 && buttonIndex === 2 ? state.step : state.step + 1;

  return {
    pollId: state.pollId,
    uuid: randomUUID(),
    step: step,
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
  const urlFid = "1";
  const userFid = previousFrame?.postBody?.untrustedData?.fid;
  let isCreator;
  console.log("Step", state.step);
  if (previousFrame?.postBody?.untrustedData) {
    console.log("Is creator", isCreator);
    isCreator = String(userFid) === urlFid;
  }
  firstImage = await generatePreviewImage(urlFid); //await generatePreviewImage(urlFid!);

  //If question get input
  //Create your own and share

  if (!isCreator && state.step === 2) {
    console.log("LOG 2", state.step);
    sessionState.question.question =
      previousFrame.postBody?.untrustedData.inputText!;
    kvSetSession(previousFrame, sessionState);
    // await setQuestion({
    //   askerId: String(userFid),
    //   receiverId: String(urlFid),
    //   questionText: previousFrame.postBody?.untrustedData.inputText!,
    //});
    secondImage = await generateConfirmationImage(
      sessionState.question.question
    );
  }

  if (
    !isCreator &&
    sessionState.question.question.length > 0 &&
    state.step === 3
  ) {
    thirdImage = await generatePreviewImage(String(userFid!));
  }

  //If answer get questions
  if (isCreator && state.step === 2 && !sessionState.questions[0]) {
    const questions = await getQuestions(String(1)); // Retrieve questions for receiverId 1
    console.log("CREATOR STEP ", questions);

    sessionState.questions = questions;
    kvSetSession(previousFrame, sessionState);
  }

  if (isCreator && state.step === 2) {
    sessionState.question = sessionState.questions[0]!;
    kvSetSession(previousFrame, sessionState);
    console.log("Step 2", sessionState.questions[0]);

    secondImage = await generateConfirmationImage(
      sessionState.questions[0]?.question!
    );
  }
  //TODO: GET QUESTIONS AND SHUFFLE

  const rotateArrayToLeft = () => {
    if (sessionState.questions.length > 0) {
      // Remove the first item and push it to the end of the array
      const array = sessionState.questions; // This removes the first element

      const firstItem = array.shift(); // This removes the first element
      if (firstItem !== undefined) {
        array.push(firstItem);
        sessionState.questions = array;
      } // And adds it to the end
    }

    console.log("ROTATED ?", sessionState.questions);

    // Assuming kvSetSession and previousFrame are defined in your context
    kvSetSession(previousFrame, sessionState);
  };

  if (
    previousFrame.postBody?.untrustedData.buttonIndex === 2 &&
    state.step === 2
  ) {
    console.log("SHUFFLING ");
    rotateArrayToLeft();
  }

  //TODO: after second step store answer and question
  if (isCreator && sessionState.answer.length < 2 && state.step === 3) {
    sessionState.answer = previousFrame.postBody?.untrustedData.inputText!;
    kvSetSession(previousFrame, sessionState);

    thirdImage = await generateAnswerImage(
      String(userFid),
      sessionState.answer,
      sessionState.question
    );
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
        ) : state.step === 1 ? (
          <FrameButton onClick={dispatch}>Send your question</FrameButton>
        ) : null}
        {state.step === 1 && isCreator ? null : state.step === 1 ? (
          <FrameButton onClick={dispatch}>See your questions</FrameButton>
        ) : null}

        {state.step === 2 && isCreator ? (
          <FrameInput text="Your answer..." />
        ) : null}
        {state.step === 2 && isCreator ? (
          <FrameButton onClick={dispatch}>Answer</FrameButton>
        ) : state.step === 2 ? (
          <FrameButton onClick={dispatch}>Create your own AMA</FrameButton>
        ) : null}
        {state.step === 2 && isCreator ? (
          <FrameButton onClick={dispatch}>Next question</FrameButton>
        ) : null}
        {state.step === 3 && isCreator ? (
          <FrameButton href={"http://tinyurl.com/4sv38u6c"}>
            Share your AMA
          </FrameButton>
        ) : state.step === 3 ? (
          <FrameButton href={"http://tinyurl.com/4sv38u6c"}>
            Share your AMA
          </FrameButton>
        ) : null}
      </FrameContainer>
    </div>
  );
}
