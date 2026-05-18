import type { TokenLocation } from "../frontend/tokenizer";
import type {
  CallStack,
  FunctionValue,
  Heap,
  Pointer,
  RuntimeValue,
  VarName,
} from "./memory";

export interface DiagnosticFrame {
  id: string;
  fn: string;
  loc: TokenLocation;
  local: Record<VarName, Pointer>;
}

export function stackDiagnostic(stack: CallStack): DiagnosticFrame[] {
  return stack.all().map((frame) => ({
    id: frame.id,
    fn: frame.fn,
    loc: frame.curr.loc,
    local: structuredClone(frame.env.all()),
  }));
}

interface ExternalFunctionValue {
  type: "function";
}

export type ExternalValue =
  | Exclude<RuntimeValue, FunctionValue>
  | ExternalFunctionValue;
export type HeapSnapshot = Record<Pointer, ExternalValue>;

export function heapSnapshot(heap: Heap) {
  const snapshot: HeapSnapshot = Object.fromEntries(
    Object.entries(heap.all()).map(([k, v]) => [
      k,
      v.type === "function" || v.type === "builtinfunction"
        ? { type: "function" }
        : v,
    ]),
  );
  return structuredClone(snapshot);
}
