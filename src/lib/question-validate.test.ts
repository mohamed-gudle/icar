import { describe, it, expect } from "vitest";
import { validateQuestionInput, type QuestionInput } from "./question-validate";

function seriesQuestion(over: Partial<QuestionInput> = {}): QuestionInput {
  return {
    type: "series",
    stemText: "A, C, E, G, __",
    options: [
      { key: "A", text: "H" },
      { key: "B", text: "I" },
      { key: "C", text: "J" },
      { key: "D", text: "K" },
    ],
    correctOptionKey: "B",
    numOptions: 4,
    ...over,
  };
}

function matrixQuestion(over: Partial<QuestionInput> = {}): QuestionInput {
  return {
    type: "matrix",
    stemImagePath: "questions/abc.png",
    options: [
      { key: "A", imagePath: "questions/a.png" },
      { key: "B", imagePath: "questions/b.png" },
      { key: "C", imagePath: "questions/c.png" },
      { key: "D", imagePath: "questions/d.png" },
    ],
    correctOptionKey: "C",
    numOptions: 4,
    ...over,
  };
}

describe("validateQuestionInput", () => {
  it("accepts a valid series question", () => {
    expect(validateQuestionInput(seriesQuestion())).toEqual({ ok: true });
  });

  it("accepts a valid matrix question with image options", () => {
    expect(validateQuestionInput(matrixQuestion())).toEqual({ ok: true });
  });

  it("rejects an unknown type", () => {
    const r = validateQuestionInput(seriesQuestion({ type: "verbal" }));
    expect(r.ok).toBe(false);
  });

  it("rejects when correctOptionKey is not among the options", () => {
    const r = validateQuestionInput(seriesQuestion({ correctOptionKey: "Z" }));
    expect(r).toMatchObject({ ok: false });
  });

  it("rejects fewer than 4 or more than 6 options", () => {
    expect(
      validateQuestionInput(
        seriesQuestion({
          options: [
            { key: "A", text: "1" },
            { key: "B", text: "2" },
            { key: "C", text: "3" },
          ],
          numOptions: 3,
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects when numOptions disagrees with options length", () => {
    expect(validateQuestionInput(seriesQuestion({ numOptions: 6 })).ok).toBe(
      false,
    );
  });

  it("rejects duplicate option keys", () => {
    const r = validateQuestionInput(
      seriesQuestion({
        options: [
          { key: "A", text: "1" },
          { key: "A", text: "2" },
          { key: "C", text: "3" },
          { key: "D", text: "4" },
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects an option with neither text nor image", () => {
    const r = validateQuestionInput(
      seriesQuestion({
        options: [
          { key: "A", text: "1" },
          { key: "B" },
          { key: "C", text: "3" },
          { key: "D", text: "4" },
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("requires stem text for series and a stem image for matrix/rotation", () => {
    expect(validateQuestionInput(seriesQuestion({ stemText: "" })).ok).toBe(
      false,
    );
    expect(
      validateQuestionInput(matrixQuestion({ stemImagePath: null })).ok,
    ).toBe(false);
  });
});
