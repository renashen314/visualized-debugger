interface OutputProps {
  printed: string[];
  onClear: () => void;
}

export const Output = (props: OutputProps) => {
  return (
    <div className="output-container">
      <div className="output-header">
        <h1>Output</h1>
        <button onClick={props.onClear} className="clear-button">
          Clear
        </button>
      </div>
      {props.printed.map((line, i) => (
        <pre key={i} className="output-line">
          {line}
        </pre>
      ))}
    </div>
  );
};
