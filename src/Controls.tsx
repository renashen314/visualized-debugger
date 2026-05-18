interface ControlProps {
  onRun: () => void;
  onStop?: () => void;
}
export const Controls = (props: ControlProps) => {
  return (
    <div style={{ display: "flex" }}>
      <button onClick={props.onRun}>Run</button>
      <button onClick={props.onStop} disabled={!props.onStop}>
        Stop
      </button>
    </div>
  );
};
