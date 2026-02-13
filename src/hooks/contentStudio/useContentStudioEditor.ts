import { useCallback, useEffect, useRef, useState } from "react";

import { validateStorylet } from "@/core/validation/storyletValidation";
import type { Storylet, StoryletChoice } from "@/types/storylets";

export type SaveState = "idle" | "saving" | "saved" | "error";

export type ValidationSummary = {
  errors: string[];
  warnings: string[];
};

export type ChoiceVectorInput = Record<string, string>;

export type EditorState = {
  draft: Storylet | null;
  dirty: boolean;
  validation: ValidationSummary | null;
  vectorInputs: ChoiceVectorInput;
  targetInputs: Record<string, string>;
  error: string | null;
  saveState: SaveState;
  lastSavedAt: Date | null;
};

const INITIAL_STATE: EditorState = {
  draft: null,
  dirty: false,
  validation: null,
  vectorInputs: {},
  targetInputs: {},
  error: null,
  saveState: "idle",
  lastSavedAt: null,
};

function formatVectorInput(vectors?: Record<string, number>) {
  if (!vectors || Object.keys(vectors).length === 0) return "";
  return Object.entries(vectors)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

export function parseVectorInput(value: string): {
  ok: boolean;
  result: Record<string, number>;
} {
  const result: Record<string, number> = {};
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, result: {} };
  const pairs = trimmed.split(",");
  for (const pair of pairs) {
    const [rawKey, rawValue] = pair.split("=");
    const key = rawKey?.trim();
    const valueStr = rawValue?.trim();
    if (!key || valueStr === undefined) {
      return { ok: false, result: {} };
    }
    const num = Number(valueStr);
    if (!Number.isFinite(num)) {
      return { ok: false, result: {} };
    }
    result[key] = num;
  }
  return { ok: true, result };
}

type UseContentStudioEditorProps = {
  storylets: Storylet[];
  onSave: (storylet: Storylet) => Promise<{ ok: boolean; error?: string }>;
  autosaveDelay?: number;
};

export function useContentStudioEditor({
  storylets,
  onSave,
  autosaveDelay = 900,
}: UseContentStudioEditorProps) {
  const [editor, setEditor] = useState<EditorState>(INITIAL_STATE);
  const autosaveTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const selectStorylet = useCallback((storylet: Storylet) => {
    const nextVectorInputs: ChoiceVectorInput = {};
    const nextTargetInputs: Record<string, string> = {};

    storylet.choices.forEach((choice) => {
      nextVectorInputs[choice.id] = formatVectorInput(
        choice.outcome?.deltas?.vectors
      );
      const target = (choice as StoryletChoice & { targetStoryletId?: string })
        .targetStoryletId;
      nextTargetInputs[choice.id] = target ?? "";
    });

    const validation = validateStorylet(storylet);

    setEditor({
      draft: storylet,
      dirty: false,
      validation: {
        errors: validation.ok ? [] : validation.errors,
        warnings: [],
      },
      vectorInputs: nextVectorInputs,
      targetInputs: nextTargetInputs,
      error: null,
      saveState: "idle",
      lastSavedAt: null,
    });
  }, []);

  const updateDraft = useCallback((update: Partial<Storylet>) => {
    setEditor((prev) => {
      if (!prev.draft) return prev;
      return {
        ...prev,
        draft: { ...prev.draft, ...update },
        dirty: true,
        saveState: "idle",
      };
    });
  }, []);

  const updateVectorInput = useCallback(
    (choiceId: string, value: string) => {
      setEditor((prev) => ({
        ...prev,
        vectorInputs: { ...prev.vectorInputs, [choiceId]: value },
        dirty: true,
        saveState: "idle",
      }));
    },
    []
  );

  const updateTargetInput = useCallback(
    (choiceId: string, value: string) => {
      setEditor((prev) => ({
        ...prev,
        targetInputs: { ...prev.targetInputs, [choiceId]: value },
        dirty: true,
        saveState: "idle",
      }));
    },
    []
  );

  const validateDraft = useCallback((): {
    ok: boolean;
    errors: string[];
  } => {
    if (!editor.draft) return { ok: false, errors: ["No draft selected"] };

    const draft = editor.draft;
    const validation = validateStorylet(draft);
    const extraErrors: string[] = [];

    // Validate vector inputs
    Object.entries(editor.vectorInputs).forEach(([choiceId, value]) => {
      const parsed = parseVectorInput(value);
      if (!parsed.ok) {
        extraErrors.push(`choices.${choiceId}.vectors malformed`);
      }
    });

    // Validate target storylet references
    draft.choices.forEach((choice) => {
      const target =
        (choice as StoryletChoice & { targetStoryletId?: string })
          .targetStoryletId ?? "";
      if (target && !storylets.some((s) => s.id === target)) {
        extraErrors.push(`choices.${choice.id}.targetStoryletId invalid`);
      }
    });

    const errors = validation.ok ? [] : validation.errors;
    const allErrors = [...errors, ...extraErrors];

    setEditor((prev) => ({
      ...prev,
      validation: { errors: allErrors, warnings: [] },
    }));

    return { ok: allErrors.length === 0, errors: allErrors };
  }, [editor.draft, editor.vectorInputs, storylets]);

  const saveDraft = useCallback(
    async (autosave: boolean = false): Promise<{ ok: boolean; error?: string }> => {
      if (!editor.draft) {
        return { ok: false, error: "No draft to save" };
      }

      const { ok: valid, errors } = validateDraft();

      if (!valid) {
        if (autosave) {
          // Silent skip for autosave with validation errors
          return { ok: false, error: "Validation errors" };
        }
        const errorMsg = editor.draft.is_active
          ? "Fix validation errors before publishing."
          : "Fix validation errors before saving.";
        setEditor((prev) => ({ ...prev, error: errorMsg }));
        return { ok: false, error: errorMsg };
      }

      setEditor((prev) => ({ ...prev, saveState: "saving", error: null }));

      const result = await onSave(editor.draft);

      if (!isMountedRef.current) return result;

      if (result.ok) {
        setEditor((prev) => ({
          ...prev,
          dirty: false,
          saveState: "saved",
          lastSavedAt: new Date(),
          error: null,
        }));
      } else {
        setEditor((prev) => ({
          ...prev,
          error: result.error ?? "Failed to save",
          saveState: "error",
        }));
      }

      return result;
    },
    [editor.draft, validateDraft, onSave]
  );

  // Autosave effect
  useEffect(() => {
    if (!editor.draft || !editor.dirty) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      saveDraft(true);
    }, autosaveDelay);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [editor.draft, editor.dirty, saveDraft, autosaveDelay]);

  const applyChoiceUpdate = useCallback(
    (choiceId: string, update: Partial<StoryletChoice>) => {
      if (!editor.draft) return;
      const nextChoices = editor.draft.choices.map((choice) =>
        choice.id === choiceId ? { ...choice, ...update } : choice
      );
      updateDraft({ choices: nextChoices });
    },
    [editor.draft, updateDraft]
  );

  const addChoice = useCallback(() => {
    if (!editor.draft) return;
    const nextId = `choice_${editor.draft.choices.length + 1}`;
    updateDraft({
      choices: [...editor.draft.choices, { id: nextId, label: "New choice" }],
    });
    setEditor((prev) => ({
      ...prev,
      vectorInputs: { ...prev.vectorInputs, [nextId]: "" },
      targetInputs: { ...prev.targetInputs, [nextId]: "" },
    }));
  }, [editor.draft, updateDraft]);

  const removeChoice = useCallback(
    (choiceId: string) => {
      if (!editor.draft) return;
      updateDraft({
        choices: editor.draft.choices.filter((choice) => choice.id !== choiceId),
      });
    },
    [editor.draft, updateDraft]
  );

  const moveChoice = useCallback(
    (choiceId: string, direction: "up" | "down") => {
      if (!editor.draft) return;
      const idx = editor.draft.choices.findIndex(
        (choice) => choice.id === choiceId
      );
      if (idx < 0) return;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= editor.draft.choices.length) return;
      const next = [...editor.draft.choices];
      const [item] = next.splice(idx, 1);
      next.splice(targetIdx, 0, item);
      updateDraft({ choices: next });
    },
    [editor.draft, updateDraft]
  );

  const clearEditor = useCallback(() => {
    setEditor(INITIAL_STATE);
  }, []);

  const clearError = useCallback(() => {
    setEditor((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    editor,
    activeStorylet: editor.draft,
    isDirty: editor.dirty,
    saveState: editor.saveState,
    lastSavedAt: editor.lastSavedAt,
    validationErrors: editor.validation?.errors ?? [],
    error: editor.error,

    // Actions
    selectStorylet,
    updateDraft,
    updateVectorInput,
    updateTargetInput,
    saveDraft,
    validateDraft,
    applyChoiceUpdate,
    addChoice,
    removeChoice,
    moveChoice,
    clearEditor,
    clearError,
  };
}
