import { GetPollsResponse } from "./datastore";

// types.ts
export type sessionStateQuestionType = {
  // pollId: string;
  question: string;
  user: string;
};

export type sessionStateAnswerType = {
  // pollId: string;
  answer: string;
  question: string;

  user: string;
};

export type State = {
  pollId?: string;
  step: number;
  uuid: string;
};
