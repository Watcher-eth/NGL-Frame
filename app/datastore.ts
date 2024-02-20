"use server";
import { v4 as uuid } from "uuid";
import { db } from "@vercel/postgres";
const client = await db.connect();

// Interface for setting a new question
export interface SetQuestionRequest {
  receiverId: string;
  questionText: string;
}

// Interface for a question received by a user
export interface Question {
  id: string;
  question: string;
}

// Use the existing GetPollsResponse for getQuestions since the structure is similar
// If needed, you can redefine or extend it specifically for questions.

// Interface for setting an answer to a question
export interface SetAnswerRequest {
  questionId: string;
  answerText: string;
}

// Interface for retrieving a specific answer
export interface AnswerResponse {
  question: string;
  answerText: string;
  userId: number;
}

export async function setQuestion(
  request: SetQuestionRequest
): Promise<boolean> {
  try {
    const { rowCount } = await client.sql`
      INSERT INTO questions (id, receiver_id, question_text)
      VALUES (${uuid()}, ${request.receiverId}, ${request.questionText});
    `;

    return rowCount > 0;
  } catch (error: any) {
    console.error("Database error:", error);
    throw new Error(error.message);
  }
}
export async function getQuestions(receiverId: string): Promise<Question[]> {
  try {
    const results = await client.sql`
      SELECT id, question_text AS question FROM questions
      WHERE receiver_id = ${receiverId} AND answer_text IS NULL;
    `;
    return results.rows.map((row) => ({
      id: row.id,
      question: row.question,
    }));
  } catch (error: any) {
    console.error("Database error:", error);
    throw new Error(error.message);
  }
}

export async function setAnswer(request: SetAnswerRequest): Promise<boolean> {
  try {
    const { rowCount } = await client.sql`
      UPDATE questions
      SET answer_text = ${request.answerText}
      WHERE id = ${request.questionId};
    `;

    return rowCount > 0;
  } catch (error: any) {
    console.error("Database error:", error);
    throw new Error(error.message);
  }
}

export async function getAnswer(
  questionId: string
): Promise<AnswerResponse | undefined> {
  try {
    const result = await client.sql`
      SELECT receiver_id AS id, question_text AS question, answer_text
      FROM questions
      WHERE id = ${questionId};
    `;

    if (result.rows.length > 0) {
      return {
        question: result.rows[0]!.question,
        answerText: result.rows[0]!.answer_text,
        userId: result.rows[0]!.id,
      };
    } else {
      return undefined;
    }
  } catch (error: any) {
    console.error("Database error:", error);
    throw new Error(error.message);
  }
}
