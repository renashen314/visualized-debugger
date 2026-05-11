import type {
  Block,
  Call,
  ExpressionStatement,
  Primitive,
} from "../frontend/ast.ts";
import type { Pointer } from "./memory.ts";

interface ContextBase {
  isBreakpointed?: boolean;
}
export interface BlockContext extends ContextBase {
  type: "Block";
  node: Block;
  pc: number;
}

export interface PrimitiveContext extends ContextBase {
  type: "Primitive";
  node: Primitive;
  phase: "init" | "done";
}
export interface ExpressionStatementContext extends ContextBase {
  type: "ExpressionStatement";
  node: ExpressionStatement;
  phase: "init" | "done";
}

export interface CallContext extends ContextBase {
  type: "Call";
  node: Call;
  phase: "init" | "targetcomputed" | "argcomputed" | "callready" | "done";
  target?: Pointer;
  args: Pointer[];
}

export type Context =
  | BlockContext
  | PrimitiveContext
  | ExpressionStatementContext
  | CallContext;

export interface Accumulator {
  val: Pointer;
  isReturn: boolean;
}
