import CodeMirror from "@uiw/react-codemirror";

interface CodeProps {
  code: string;
  onChange: (code: string) => void;
}

export const Code = (props: CodeProps) => {
  return (
    <CodeMirror
      style={{ minWidth: "400px", textAlign: "left" }}
      value={props.code}
      onChange={props.onChange}
    />
  );
};
