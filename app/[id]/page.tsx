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
import { generateConfirmationImage } from "../generateConfirmationImage";
import {
  FollowResponseUser,
  User,
} from "@neynar/nodejs-sdk/build/neynar-api/v1";
import { Question, getQuestions, setAnswer, setQuestion } from "../datastore";
import {
  State,
  sessionStateAnswerType,
  sessionStateQuestionType,
} from "../types";
import { randomUUID, randomInt } from "crypto";
import { generatePreviewImage } from "../generate-question";
import { generateAnswerImage } from "../generateAnswerConfirmation copy";
import {
  kvDeleteSession,
  kvGetSession,
  kvSetSession,
  sessionStateType,
} from "../sessionStore";
import { shuffleArray } from "../utils";
import axios from "axios";
import sharp from "sharp";

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
  params: { id: number };
}) {
  //console.log("RENDERING? ////////////////////");
  const previousFrame = getPreviousFrame<State>(searchParams);
  let sessionState: sessionStateType = await kvGetSession(previousFrame);

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
  if (state.step === 1 && sessionState.question.question !== "") {
    kvDeleteSession(previousFrame);
  }

  state.pollId = sessionState.question ? sessionState.question?.id! : "";

  async function create(svgDataUri: string) {
    "use server";
    const buffer = Buffer.from(svgDataUri, "utf-8");

    const convertedImage = await sharp(buffer)
      .toFormat("jpeg", { quality: 80 })
      .toBuffer();

    return convertedImage;
  }

  //Images
  let firstImage: string;
  let secondImage: string;
  let thirdImage: string;

  //CHECK if question or answer
  // const url = previousFrame?.postBody?.untrustedData.url!;
  //const parts = url.split("/"); // This splits the URL string into an array of parts
  const urlFid = params.id;
  const userFid = previousFrame?.postBody?.untrustedData?.fid;
  let isCreator: boolean;
  if (previousFrame?.postBody?.untrustedData) {
    isCreator = String(userFid) === String(urlFid);
    console.log("Is creator", isCreator);
  }
  firstImage = await generatePreviewImage(String(urlFid)); //await generatePreviewImage(urlFid!);
  console.log(" creator", isCreator!);

  //If question get input
  //Create your own and share

  if (
    !isCreator! &&
    state.step === 2 &&
    previousFrame.postBody?.untrustedData.buttonIndex !== 2
  ) {
    console.log("LOG 2", state.step);
    sessionState.question.question =
      previousFrame.postBody?.untrustedData.inputText!;
    kvSetSession(previousFrame, sessionState);
    await setQuestion({
      receiverId: String(urlFid),
      questionText: previousFrame.postBody?.untrustedData.inputText!,
    });
    const thiImage = await generateConfirmationImage(
      previousFrame.postBody?.untrustedData.inputText!
    );
    const thirImage = await create(thiImage!);
    const imageBase64 = thirImage.toString("base64");
    secondImage = `data:image/jpeg;base64,${imageBase64}`;
  }

  if (
    isCreator! === false &&
    state.step === 3 &&
    !previousFrame.postBody?.untrustedData.inputText?.length
  ) {
    const thImage = await generatePreviewImage(String(userFid!));

    const thirImage = await create(thImage!);
    const imageBase64 = thirImage.toString("base64");
    thirdImage = `data:image/jpeg;base64,${imageBase64}`;
  }

  if (
    isCreator! === false &&
    state.step === 3 &&
    previousFrame.postBody?.untrustedData.inputText?.length! > 2
  ) {
    console.log(
      "Non creator 3 answer",
      state.step,
      previousFrame.postBody?.untrustedData.inputText?.length
    );
    sessionState.answer = previousFrame.postBody?.untrustedData.inputText!;
    kvSetSession(previousFrame, sessionState);

    const thImage = await generateAnswerImage(
      String(userFid),
      sessionState.answer,
      sessionState.question
    );
    console.log("Ansswer image");
    const thirImage = await create(thImage!);
    const imageBase64 = thirImage.toString("base64");
    thirdImage = `data:image/jpeg;base64,${imageBase64}`;
    await setAnswer({
      questionId: sessionState.question.id,
      answerText: sessionState.answer,
    });
  }

  //If answer get questions
  if (
    isCreator! === true &&
    state.step === 2 &&
    sessionState.questions.length < 1
  ) {
    const questions = await getQuestions(String(userFid)); // Retrieve questions for receiverId 1
    console.log("CREATOR STEP 2", sessionState.questions.length);

    sessionState.questions = questions;
    kvSetSession(previousFrame, sessionState);
  }

  if (isCreator! === true && state.step === 2) {
    sessionState.question = sessionState.questions[1]!;
    kvSetSession(previousFrame, sessionState);
    console.log("Step 2", sessionState.questions[1]);

    const thiImage = await generateConfirmationImage(
      sessionState.questions[0]?.question!
    );
    const thirImage = await create(thiImage!);
    const imageBase64 = thirImage.toString("base64");
    secondImage = `data:image/jpeg;base64,${imageBase64}`;
  }

  if (
    isCreator! === false &&
    sessionState.questions.length < 1 &&
    previousFrame.postBody?.untrustedData?.buttonIndex === 2
  ) {
    const questions = await getQuestions(String(userFid)); // Retrieve questions for receiverId 1
    console.log("Not CREATOR STEP 2", urlFid, userFid, questions);

    sessionState.questions = questions;
    kvSetSession(previousFrame, sessionState);
  }

  if (
    isCreator! === false &&
    state.step === 2 &&
    previousFrame.postBody?.untrustedData?.buttonIndex === 2
  ) {
    sessionState.question = sessionState.questions[0]!;
    kvSetSession(previousFrame, sessionState);
    console.log("Step 2");

    const thiImage = await generateConfirmationImage(
      sessionState.questions[0]?.question!
    );
    const thirImage = await create(thiImage!);
    const imageBase64 = thirImage.toString("base64");
    secondImage = `data:image/jpeg;base64,${imageBase64}`;
  }
  //TODO: GET QUESTIONS AND SHUFFLE
  const rotateArrayToLeft = async () => {
    if (sessionState.questions.length > 0) {
      // Remove the first item and push it to the end of the array
      const array = [...sessionState.questions]; // Clone the array to avoid direct mutation

      const firstItem = array.shift(); // This removes the first element
      if (firstItem !== undefined) {
        array.push(firstItem); // And adds it to the end
        sessionState.questions = array; // Update the session state with the new array

        console.log("ROTATED ?", sessionState.questions, firstItem);

        // Ensure kvSetSession is awaited if it returns a Promise
        await kvSetSession(previousFrame, sessionState);
      }
    }
  };

  if (
    previousFrame.postBody?.untrustedData.buttonIndex === 2 &&
    state.step === 2
  ) {
    console.log("SHUFFLING ");
    await rotateArrayToLeft(); // Ensure this call is awaited if within an async function or handled accordingly if not
  }

  //TODO: after second step store answer and question
  if (
    isCreator! &&
    previousFrame.postBody?.untrustedData.inputText?.length! > 2 &&
    state.step === 3
  ) {
    sessionState.answer = previousFrame.postBody?.untrustedData.inputText!;
    kvSetSession(previousFrame, sessionState);

    const thImage = await generateAnswerImage(
      String(userFid),
      sessionState.answer,
      sessionState.question
    );

    const thirImage = await create(thImage!);
    const imageBase64 = thirImage.toString("base64");
    thirdImage = `data:image/jpeg;base64,${imageBase64}`;
    await setAnswer({
      questionId: sessionState.question.id,
      answerText: sessionState.answer,
    });
  }

  const Fiimage = await create(firstImage);

  function getImage() {
    if (state.step === 1) {
      console.log("image 1", Fiimage);
      const imageBase64 = Fiimage.toString("base64");
      const imageDataUri = `data:image/jpeg;base64,${imageBase64}`;

      return imageDataUri;
    }

    if (state.step === 2) {
      return secondImage;
    }

    if (state.step === 3 && isCreator === true) {
      kvDeleteSession(previousFrame);

      return thirdImage;
    }
    if (
      state.step === 3 &&
      isCreator === false &&
      !previousFrame.postBody?.untrustedData.inputText?.length
    ) {
      kvDeleteSession(previousFrame);

      return thirdImage;
    }
    if (
      state.step === 3 &&
      isCreator === false &&
      previousFrame.postBody?.untrustedData.inputText?.length
    ) {
      kvDeleteSession(previousFrame);

      return thirdImage;
    }

    return "/images/GasFramePreview.png";
  }
  const image = getImage();
  return (
    <div>
      What are you doing here?. <Link href="/debug">Debug</Link>
      <FrameContainer
        postUrl="/frames"
        pathname={`${urlFid}/`}
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage src={image} />
        {state.step === 1 && !isCreator! ? (
          <FrameInput text="Ask me anything" />
        ) : null}
        {state.step === 1 && isCreator! ? (
          <FrameButton onClick={dispatch}>See your questions</FrameButton>
        ) : state.step === 1 ? (
          <FrameButton onClick={dispatch}>Send 📩</FrameButton>
        ) : null}
        {state.step === 1 && isCreator! ? null : state.step === 1 ? (
          <FrameButton onClick={dispatch}>Your questions 👀</FrameButton>
        ) : null}

        {state.step === 2 &&
        previousFrame.postBody?.untrustedData.buttonIndex === 2 ? (
          <FrameInput text="Your answer..." />
        ) : null}
        {state.step === 2 && isCreator! ? (
          <FrameButton onClick={dispatch}>Answer</FrameButton>
        ) : state.step === 2 ? (
          previousFrame.postBody?.untrustedData.buttonIndex === 2 ? (
            <FrameButton onClick={dispatch}>Answer</FrameButton>
          ) : (
            <FrameButton onClick={dispatch}>Create your own AMA</FrameButton>
          )
        ) : null}
        {state.step === 2 &&
        previousFrame.postBody?.untrustedData.buttonIndex === 2 ? (
          <FrameButton onClick={dispatch}>Next question</FrameButton>
        ) : null}
        {state.step === 3 &&
        previousFrame.postBody?.untrustedData.inputText! ? (
          <FrameButton
            href={`https://warpcast.com/~/compose?text=Ask%20me%20anything%20!%20%F0%9F%94%A5%20Check%20out%20who%20sent%20you%20compliments!%20&embeds%5B%5D=http://ngl-fc.vercel.app/a/${sessionState.question.id}`}
          >
            Share your Answer
          </FrameButton>
        ) : state.step === 3 ? (
          <FrameButton
            href={`https://warpcast.com/~/compose?text=Ask%20me%20anything%20!%20%F0%9F%94%A5%20Check%20out%20who%20sent%20you%20compliments!%20&embeds%5B%5D=https://ngl-fc.vercel.app/${userFid}`}
          >
            Share your AMA
          </FrameButton>
        ) : null}
      </FrameContainer>
    </div>
  );
}
