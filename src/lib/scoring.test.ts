import { describe, it, expect } from "vitest";
import { scoreAnswers } from "./scoring";

const keys = new Map([
  ["q1", "A"],
  ["q2", "B"],
  ["q3", "C"],
]);

describe("scoreAnswers", () => {
  it("counts correct answers", () => {
    const raw = scoreAnswers(
      [
        { questionId: "q1", selectedOptionKey: "A" },
        { questionId: "q2", selectedOptionKey: "B" },
        { questionId: "q3", selectedOptionKey: "X" },
      ],
      keys,
    );
    expect(raw).toBe(2);
  });

  it("scores all-correct and none-correct", () => {
    expect(
      scoreAnswers(
        [
          { questionId: "q1", selectedOptionKey: "A" },
          { questionId: "q2", selectedOptionKey: "B" },
          { questionId: "q3", selectedOptionKey: "C" },
        ],
        keys,
      ),
    ).toBe(3);
    expect(
      scoreAnswers([{ questionId: "q1", selectedOptionKey: "Z" }], keys),
    ).toBe(0);
  });

  it("treats unanswered questions as wrong (not present = no point)", () => {
    expect(
      scoreAnswers([{ questionId: "q1", selectedOptionKey: "A" }], keys),
    ).toBe(1);
  });

  it("counts each question at most once", () => {
    expect(
      scoreAnswers(
        [
          { questionId: "q1", selectedOptionKey: "A" },
          { questionId: "q1", selectedOptionKey: "A" },
        ],
        keys,
      ),
    ).toBe(1);
  });

  it("ignores answers to unknown questions", () => {
    expect(
      scoreAnswers([{ questionId: "qX", selectedOptionKey: "A" }], keys),
    ).toBe(0);
  });
});
