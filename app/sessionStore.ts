import { PreviousFrame } from "frames.js/next/server";
import { Question } from "./datastore";
import { kv } from "@vercel/kv";
import { State } from "./types";

export type sessionStateType = {
  answer: string;
  // voter: string;
  user: string;
  questions: Question[];
  question: Question;
  // questions: GetPollsResponse[];
};

// Initial state
let sessionState: sessionStateType = {
  answer: "",
  questions: [],
  user: "",
  question: {} as Question,
  // questions: [] as GetPollsResponse[],
};

// Function to get the current session state
export function getSessionState(): sessionStateType {
  return sessionState;
}

// Function to update the session state
export function updateSessionState(
  updatedState: Partial<sessionStateType>
): void {
  sessionState = { ...sessionState, ...updatedState };
}

export async function kvSetSession(
  previousFrame: PreviousFrame<State>,
  state: sessionStateType
): Promise<boolean> {
  if (
    previousFrame.postBody &&
    previousFrame.postBody.untrustedData &&
    previousFrame.postBody.untrustedData.fid
  ) {
    const fidStr = String(previousFrame.postBody?.untrustedData?.fid);
    const result = await kv.hset(fidStr, state);
    if (result > 0) return true;
  }

  return false;
}

export async function kvGetSession(
  previousFrame: PreviousFrame<State>
): Promise<sessionStateType> {
  let state: sessionStateType = {
    answer: "",
    user: "",
    question: { question: "", id: "" } as Question,
    questions: [],
  };
  if (
    previousFrame.postBody &&
    previousFrame.postBody.untrustedData &&
    previousFrame.postBody.untrustedData.fid
  ) {
    const fidStr = String(previousFrame.postBody?.untrustedData?.fid);
    const result = await kv.hgetall(fidStr);
    if (!!result) {
      state = {
        answer: result["answer"] as string,
        user: result["user"] as string,
        question: result["question"] as Question,
        questions: result["questions"] as Question[],
      };
      console.log("FOUND SESSION ", fidStr, state);
      return state;
    }
  }

  return state;
}

export async function kvDeleteSession(
  previousFrame: PreviousFrame<State>
): Promise<boolean> {
  if (
    previousFrame.postBody &&
    previousFrame.postBody.untrustedData &&
    previousFrame.postBody.untrustedData.fid
  ) {
    const fidStr = String(previousFrame.postBody?.untrustedData?.fid);
    const result = await kv.del(fidStr);
    if (result === 1) return true;
  }

  return false;
}
