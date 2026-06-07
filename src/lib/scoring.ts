/**
 * Pure scoring. Raw number-correct out of the total served. Unanswered
 * questions simply do not appear in `answers` and therefore count as wrong.
 * Correct keys live only on the server and never reach the candidate.
 */

export type AnswerInput = { questionId: string; selectedOptionKey: string };

export function scoreAnswers(
  answers: readonly AnswerInput[],
  correctByQuestion: ReadonlyMap<string, string>,
): number {
  let raw = 0;
  const seen = new Set<string>();
  for (const a of answers) {
    if (seen.has(a.questionId)) continue; // defensive: count each question once
    seen.add(a.questionId);
    if (correctByQuestion.get(a.questionId) === a.selectedOptionKey) raw++;
  }
  return raw;
}
