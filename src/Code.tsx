import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
  breakpointEffect,
  breakpointGutter,
  breakpointState,
} from "./codemirror/breakpoints";
import {
  highlightEffect,
  highlightField,
  type Range,
} from "./codemirror/highlights";
import { useEffect, useRef } from "react";

interface CodeProps {
  code: string;
  highlight?: Range;
  readonly: boolean;
  onChange: (code: string) => void;
  onBreakpoint: (bps: number[]) => void;
}

export const Code = (props: CodeProps) => {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  useEffect(() => {
    if (props.highlight) {
      editorRef.current?.view?.dispatch({
        effects: highlightEffect.of({
          type: "set",
          ...props.highlight,
        }),
      });
    } else {
      editorRef.current?.view?.dispatch({
        effects: highlightEffect.of({
          type: "clear",
        }),
      });
    }
  }, [props.highlight]);
  return (
    <CodeMirror
      ref={editorRef}
      theme="dark"
      readOnly={props.readonly}
      value={props.code}
      onUpdate={(update) => {
        const effectTriggered = update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(breakpointEffect)),
        );
        if (effectTriggered || update.docChanged) {
          // need to check doc updates because codemirror tracks everything (e.g clicks). no doc update misses auto breakpoint move
          const bps: number[] = [];
          update.state
            .field(breakpointState)
            .between(0, update.state.doc.length, (from) => {
              bps.push(update.state.doc.lineAt(from).number);
            });
          props.onBreakpoint(bps);
        }
      }}
      basicSetup={{
        highlightActiveLineGutter: false,
        highlightActiveLine: false,
        foldGutter: false,
      }}
      onChange={props.onChange}
      extensions={[breakpointGutter, highlightField]}
    />
  );
};
