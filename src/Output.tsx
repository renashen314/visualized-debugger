interface OutputProps {
  printed: string[];
  onClear: () => void;
}

export const Output = (props: OutputProps) => {
  return (
    <div>
      <h1>Output</h1>
      <button onClick={props.onClear} style={{ marginBottom: 20 }}>
        Clear
      </button>
      {props.printed.map((line, i) => (
        <pre key={i}>{line}</pre>
      ))}
    </div>
  );
};
