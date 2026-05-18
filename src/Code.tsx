import CodeMirror from "@uiw/react-codemirror";
import {
  breakpointEffect,
  breakpointGutter,
  breakpointState,
} from "./codemirror/breakpoints";

interface CodeProps {
  code: string;
  onChange: (code: string) => void;
  onBreakpoint: (bps: number[]) => void;
}

export const Code = (props: CodeProps) => {
  return (
    <CodeMirror
      style={{ minWidth: "400px", textAlign: "left" }}
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
      onChange={props.onChange}
      extensions={[breakpointGutter]}
    />
  );
};
