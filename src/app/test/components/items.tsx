"use client";

import type { ClientQuestion } from "@/lib/session";
import { AssetImage } from "./AssetImage";

/** Stem renderer for matrix reasoning items: the 3×3 array image. */
export function MatrixStem({ question }: { question: ClientQuestion }) {
  return (
    <div className="rounded-card border border-line bg-card p-5">
      {question.stemImagePath ? (
        <AssetImage
          path={question.stemImagePath}
          alt="Matrix pattern with the bottom-right cell missing"
          className="mx-auto max-h-80 w-auto"
        />
      ) : (
        <p className="text-sm text-muted">Image unavailable.</p>
      )}
    </div>
  );
}

/** Stem renderer for 3D rotation items: the target object image. */
export function RotationStem({ question }: { question: ClientQuestion }) {
  return (
    <div className="rounded-card border border-line bg-card p-5">
      {question.stemImagePath ? (
        <AssetImage
          path={question.stemImagePath}
          alt="Target 3D object"
          className="mx-auto max-h-80 w-auto"
        />
      ) : (
        <p className="text-sm text-muted">Image unavailable.</p>
      )}
    </div>
  );
}

/** Stem renderer for letter/number series items: the text sequence. */
export function SeriesStem({ question }: { question: ClientQuestion }) {
  return (
    <div className="rounded-card border border-line bg-card p-6">
      <p className="text-center font-mono text-2xl tracking-[0.25em]">
        {question.stemText}
      </p>
    </div>
  );
}

export function QuestionStem({ question }: { question: ClientQuestion }) {
  switch (question.type) {
    case "matrix":
      return <MatrixStem question={question} />;
    case "rotation":
      return <RotationStem question={question} />;
    case "series":
      return <SeriesStem question={question} />;
  }
}

const TYPE_LABEL: Record<ClientQuestion["type"], string> = {
  matrix: "Matrix reasoning",
  rotation: "3D rotation",
  series: "Letter & number series",
};

const TYPE_PROMPT: Record<ClientQuestion["type"], string> = {
  matrix: "Which option completes the pattern?",
  rotation: "Which option is a valid rotation of the object above?",
  series: "Which option comes next in the sequence?",
};

export function typeLabel(t: ClientQuestion["type"]) {
  return TYPE_LABEL[t];
}
export function typePrompt(t: ClientQuestion["type"]) {
  return TYPE_PROMPT[t];
}
