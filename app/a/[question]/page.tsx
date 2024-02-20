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

import {
  Question,
  getQuestions,
  setAnswer,
  setQuestion,
} from "../../datastore";
import {
  State,
  sessionStateAnswerType,
  sessionStateQuestionType,
} from "../../types";
import { randomUUID, randomInt } from "crypto";
import { generatePreviewImage } from "../../generate-question";
import { generateAnswerImage } from "../../generateAnswerConfirmation copy";
import {
  kvDeleteSession,
  kvGetSession,
  kvSetSession,
  sessionStateType,
} from "../../sessionStore";
import { getAnswer } from "../../datastore";
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
  params,
}: {
  searchParams: Record<string, string>;
  params: { question: string };
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
  //console.log("PREV FRAME", previousFrame);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    // ...DEBUG_HUB_OPTIONS,
    fetchHubContext: true,
  });
  console.log("Search params", searchParams, params.id);

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
  const urlParam = params.question;
  const userFid = previousFrame?.postBody?.untrustedData?.fid;
  let isCreator;
  console.log("Step", state.step);

  //TODO: after second step store answer and question
  if (state.step === 1) {
    const answer = await getAnswer(urlParam);
    console.log("Answer", answer);
    thirdImage = await generateAnswerImage(
      String(answer?.userId),
      answer?.answerText,
      {
        id: urlParam,
        question: answer?.question,
      }
    );
  }

  //TODO: after second step store answer and question
  if (state.step === 2) {
    firstImage = await generatePreviewImage(String(userFid)); //await generatePreviewImage(urlFid!);
  }
  function getImage() {
    if (state.step === 1) {
      const encodedConf = encodeURIComponent(thirdImage!)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");

      const confSVG = `data:image/svg+xml,${encodedConf}`;
      return confSVG;
    }

    if (state.step === 2) {
      const encodedConf = encodeURIComponent(firstImage!)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");

      const confSVG = `data:image/svg+xml,${encodedConf}`;
      return confSVG;
    }

    const encodedConf = encodeURIComponent(thirdImage!)
      .replace(/'/g, "%27")
      .replace(/"/g, "%22");

    const confSVG = `data:image/svg+xml,${encodedConf}`;
    return confSVG;
  }
  const image = getImage();
  console.log("Image");
  return (
    <div>
      What are you doing here?. <Link href="/debug">Debug</Link>
      <FrameContainer
        postUrl="/frames"
        pathname={`a/${urlParam}`}
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage src={image} />

        {state.step === 1 ? (
          <FrameButton onClick={dispatch}>Create your own AMA</FrameButton>
        ) : null}

        {state.step === 2 ? (
          <FrameButton
            onClick={dispatch}
            href={`http://ngl-fc.vercel.app/${userFid}`}
          >
            Share your AMA
          </FrameButton>
        ) : null}
      </FrameContainer>
    </div>
  );
}
