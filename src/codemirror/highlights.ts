import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";

const highlightMark = Decoration.mark({
  attributes: { style: "background-color: #58a6ff33; border-radius: 2px;" },
});

export interface Range {
  from: number;
  to: number;
}

interface HighlightEffect extends Range {
  type: "set";
}

interface ClearEffect {
  type: "clear";
}

export const highlightEffect = StateEffect.define<
  HighlightEffect | ClearEffect
>();

export const highlightField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes); // keep highlight position if user types
    for (let e of tr.effects) {
      if (e.is(highlightEffect)) {
        if (e.value.type === "set") {
          return Decoration.set([
            highlightMark.range(e.value.from, e.value.to),
          ]);
        }
        if (e.value.type === "clear") {
          return Decoration.none;
        }
      }
    }
    return decorations;
  },

  provide: (field) => EditorView.decorations.from(field),
});
