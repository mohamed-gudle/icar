import { ICAR_TYPES, type IcarType } from "./config";
import type { QuestionOption } from "@/db/schema";

export type QuestionInput = {
  type: string;
  stemText?: string | null;
  stemImagePath?: string | null;
  options: QuestionOption[];
  correctOptionKey: string;
  numOptions: number;
  difficulty?: number | null;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

const MIN_OPTIONS = 4;
const MAX_OPTIONS = 6;

/**
 * Validate an admin-authored question. Enforces ICAR type, option/key
 * integrity, the correct-key-must-exist rule, and per-type stem requirements.
 * Pure — no I/O — so it is unit-testable and reusable on client and server.
 */
export function validateQuestionInput(input: QuestionInput): ValidationResult {
  if (!ICAR_TYPES.includes(input.type as IcarType)) {
    return { ok: false, error: `type must be one of ${ICAR_TYPES.join(", ")}` };
  }
  const type = input.type as IcarType;

  const opts = input.options ?? [];
  if (opts.length < MIN_OPTIONS || opts.length > MAX_OPTIONS) {
    return { ok: false, error: `provide between ${MIN_OPTIONS} and ${MAX_OPTIONS} options` };
  }
  if (input.numOptions !== opts.length) {
    return { ok: false, error: "numOptions must equal the number of options" };
  }

  const keys = opts.map((o) => o.key);
  if (keys.some((k) => !k || !k.trim())) {
    return { ok: false, error: "every option needs a key" };
  }
  if (new Set(keys).size !== keys.length) {
    return { ok: false, error: "option keys must be unique" };
  }

  for (const o of opts) {
    const hasText = Boolean(o.text && o.text.trim());
    const hasImage = Boolean(o.imagePath && o.imagePath.trim());
    if (!hasText && !hasImage) {
      return { ok: false, error: `option ${o.key} needs text or an image` };
    }
  }

  if (!keys.includes(input.correctOptionKey)) {
    return { ok: false, error: "correctOptionKey must match one of the option keys" };
  }

  if (type === "series") {
    if (!input.stemText || !input.stemText.trim()) {
      return { ok: false, error: "series questions need stem text" };
    }
  } else {
    // matrix | rotation
    if (!input.stemImagePath || !input.stemImagePath.trim()) {
      return { ok: false, error: `${type} questions need a stem image` };
    }
  }

  return { ok: true };
}
