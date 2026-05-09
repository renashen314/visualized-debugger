import type { Block, ExpressionStatement, Primitive } from "../frontend/ast.ts";
import type { Pointer } from "./memory.ts";

export interface BlockContext {
  type: "Block";
  node: Block;
  pc: number;
}

export interface PrimitiveContext {
  type: "Primitive";
  node: Primitive;
  phase: "init" | "done";
}
export interface ExpressionStatementContext {
  type: "ExpressionStatement";
  node: ExpressionStatement;
  phase: "init" | "done";
}

export type Context =
  | BlockContext
  | PrimitiveContext
  | ExpressionStatementContext;

export interface Accumulator {
  val: Pointer;
}
