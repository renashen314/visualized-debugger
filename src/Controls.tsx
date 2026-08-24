interface ControlProps {
  onRun: () => void;
  onStop?: () => void;
}
export const Controls = (props: ControlProps) => {
  return (
    <div className="controls-pane">
      <button onClick={props.onRun} className="primary">
        Run
      </button>
      <button onClick={props.onStop} disabled={!props.onStop}>
        Stop
      </button>
    </div>
  );
};
