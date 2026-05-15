import type {
  ArrayLiteral,
  BinaryExpression,
  Block,
  Call,
  ElementAccess,
  ExpressionStatement,
  ObjectLiteral,
  ParenthesizedExpression,
  Primitive,
  PropAccess,
  UnaryExpression,
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

export interface ParenthesizedExpresionContext extends ContextBase {
  type: "ParenthesizedExpression";
  node: ParenthesizedExpression;
  phase: "init" | "done";
}

export interface ArrayLiteralContext extends ContextBase {
  type: "ArrayLiteral";
  node: ArrayLiteral;
  phase: "init" | "elemscomputed" | "done";
  elems: Pointer[];
}
export interface ObjectLiteralContext extends ContextBase {
  type: "ObjectLiteral";
  node: ObjectLiteral;
  phase: "init" | "keycomputed" | "valuecomputed" | "done";
  key?: string;
  pairs: [string, Pointer][];
}

export interface BinaryExpressionContext extends ContextBase {
  type: "BinaryExpression";
  node: BinaryExpression;
  phase: "init" | "lhscomputed" | "rhscomputed";
  left?: Pointer;
}

export interface UnaryExpressionContext extends ContextBase {
  type: "UnaryExpression";
  node: UnaryExpression;
  phase: "init" | "argcomputed";
}
export interface PropAccessContext extends ContextBase {
  type: "PropAccess";
  node: PropAccess;
  phase: "init" | "targetcomputed";
}
export interface ElementAccessContext extends ContextBase {
  type: "ElementAccess";
  node: ElementAccess;
  phase: "init" | "targetcomputed" | "idxcomputed";
  target?: Pointer;
}

export type Context =
  | BlockContext
  | PrimitiveContext
  | ExpressionStatementContext
  | CallContext
  | ParenthesizedExpresionContext
  | ArrayLiteralContext
  | ObjectLiteralContext
  | BinaryExpressionContext
  | UnaryExpressionContext
  | PropAccessContext
  | ElementAccessContext;

export interface Accumulator {
  val: Pointer;
  isReturn: boolean;
}
