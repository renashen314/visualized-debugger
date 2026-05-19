import {
  type ExternalValue,
  type HeapSnapshot,
} from "./interpreter/backend/diagnostics";
import type { Pointer, VarName } from "./interpreter/backend/memory";

function stringify(v: ExternalValue): string {
  switch (v.type) {
    case "string":
      return `"${v.value}"`;
    case "number":
    case "boolean":
      return `${v.value}`;
    case "null":
      return "null";
    case "object":
      return "{ ... }";
    case "array":
      return "[ ... ]";
    case "function":
      return "<function>";
  }
}

interface Entry {
  name: string;
  value: string;
  ptr: Pointer;
  depth: number;
  expandable: boolean;
}

function flatten(
  local: Record<VarName, Pointer>,
  heap: HeapSnapshot,
  expanded: Record<Pointer, boolean>,
): Entry[] {
  const entries: Entry[] = [];

  const preorder = (name: string, ptr: Pointer, depth: number) => {
    const v = heap[ptr];
    entries.push({
      name,
      value: stringify(v),
      depth,
      expandable: v.type === "array" || v.type === "object",
      ptr,
    });
    if (v.type === "array" && expanded[ptr]) {
      for (let i = 0; i < v.elements.length; i++) {
        preorder(`${i}`, v.elements[i], depth + 1);
      }
    }
    if (v.type === "object" && expanded[ptr]) {
      for (const [name, ptr] of Object.entries(v.properties)) {
        preorder(name, ptr, depth + 1);
      }
    }
  };
  for (const [name, ptr] of Object.entries(local)) {
    preorder(name, ptr, 0);
  }
  return entries;
}

export type FrameId = string;

export interface InputFrame {
  id: FrameId;
  fn: string;
  local: Record<VarName, Pointer>;
  expanded: Record<Pointer, boolean>;
}

interface RenderedFrame {
  id: FrameId;
  name: string;
  entries: Entry[];
}

export interface StackProps {
  stack: InputFrame[];
  heap: HeapSnapshot;
  curr: number;
  onExpand: (id: FrameId, ptr: Pointer) => void;
  onCurr: (curr: number) => void;
}
export const Stack = (props: StackProps) => {
  const frames: RenderedFrame[] = props.stack.map((frame) => ({
    id: frame.id,
    name: frame.fn,
    entries: flatten(frame.local, props.heap, frame.expanded),
  }));

  return (
    <div style={{ marginLeft: 50 }}>
      <h1 style={{ marginBottom: 20 }}>Stack</h1>
      {frames.map((frame, i) => (
        <div
          key={i}
          style={{
            border: props.curr === i ? "2px solid red" : "2px solid grey",
            padding: 20,
          }}
          onClick={() => props.onCurr(i)}
        >
          <h4>{frame.name}</h4>
          {frame.entries.map((entry, j) => (
            <div
              key={`${i} ${j}`}
              style={{ paddingLeft: entry.depth * 16, textAlign: "left" }}
              onClick={() => {
                if (entry.expandable) {
                  props.onExpand(frame.id, entry.ptr);
                }
              }}
            >
              <span>
                {entry.name}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
