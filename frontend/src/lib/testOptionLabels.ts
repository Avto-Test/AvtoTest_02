import type { PublicQuestion } from "@/types/test";
import type { Question } from "@/schemas/test.schema";

type QuestionLike = Pick<PublicQuestion, "answer_options"> | Pick<Question, "answer_options">;

export function getOptionFunctionLabel(index: number): string {
  return `F${index + 1}`;
}

export function getOptionFunctionLabelById(question: QuestionLike, optionId: string): string | null {
  const optionIndex = question.answer_options.findIndex((option) => option.id === optionId);
  if (optionIndex < 0 || optionIndex > 3) {
    return null;
  }
  return getOptionFunctionLabel(optionIndex);
}
