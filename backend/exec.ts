import type { ASTNode } from "../frontend/ast.ts";
import type {
  Accumulator,
  BlockContext,
  Context,
  ExpressionStatementContext,
  PrimitiveContext,
} from "./context.ts";
import type { CallStack, Heap } from "./memory.ts";

export function initCtx(node: ASTNode): Context {
  switch (node.type) {
    case "Block":
      return { type: "Block", node, pc: 0 };
    case "NullLiteral":
    case "BooleanLiteral":
    case "StringLiteral":
    case "NumberLiteral":
    case "Identifier":
      return { type: "Primitive", node, phase: "init" };
    case "ExpressionStatement":
      return { type: "ExpressionStatement", node, phase: "init" };
    case "IfStatement":
    case "WhileLoop":
    case "FunctionDeclaration":
    case "ReturnStatement":
    case "AssignmentStatement":
    case "Call":
    default: {
      throw new Error("TODO");
    }
  }
}

interface State {
  heap: Heap;
  callStack: CallStack;
  execStack: Context[];
  acc: Accumulator;
}

export function execBlock(ctx: BlockContext, state: State) {
  if (ctx.pc === ctx.node.statements.length) {
    state.execStack.pop();
    return;
  }

  const next = ctx.node.statements[ctx.pc];
  ctx.pc += 1;
  state.execStack.push(initCtx(next));
}

export function execPrimitive(ctx: PrimitiveContext, state: State) {
  if (ctx.phase === "init") {
    switch (ctx.node.type) {
      case "NullLiteral": {
        state.acc.val = state.heap.set({ type: "null" });
        break;
      }
      case "BooleanLiteral": {
        state.acc.val = state.heap.set({
          type: "boolean",
          value: ctx.node.value,
        });
        break;
      }
      case "StringLiteral": {
        state.acc.val = state.heap.set({
          type: "string",
          value: ctx.node.value,
        });
        break;
      }
      case "NumberLiteral": {
        state.acc.val = state.heap.set({
          type: "number",
          value: ctx.node.value,
        });
        break;
      }
      case "Identifier": {
        const pointer = state.callStack.peek().env.get(ctx.node.name);
        if (pointer === undefined) {
          throw new Error(`ReferenceError: ${ctx.node.name} is not defined`);
        }
        state.acc.val = pointer;
        break;
      }
    }
    ctx.phase = "done";
    return;
  }
  if (ctx.phase === "done") {
    state.execStack.pop();
    return;
  }
}
export function execExpressionStatement(
  ctx: ExpressionStatementContext,
  state: State,
) {
  if (ctx.phase === "init") {
    state.execStack.push(initCtx(ctx.node.expression));
    ctx.phase = "done";
    return;
  }

  if (ctx.phase === "done") {
    state.execStack.pop();
    return;
  }
}

export function exec(ctx: Context, state: State) {
  switch (ctx.type) {
    case "Block":
      return execBlock(ctx, state);
    case "ExpressionStatement":
      return execExpressionStatement(ctx, state);
    case "Primitive":
      return execPrimitive(ctx, state);
    default:
      break;
  }
}
