import type { ASTNode } from "../frontend/ast.ts";
import type {
  Accumulator,
  BlockContext,
  CallContext,
  Context,
  ExpressionStatementContext,
  PrimitiveContext,
} from "./context.ts";
import { LexicalEnvironment, type CallStack, type Heap } from "./memory.ts";

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
    case "Call":
      return { type: "Call", node, phase: "init", args: [] };
    case "IfStatement":
    case "WhileLoop":
    case "FunctionDeclaration":
    case "ReturnStatement":
    case "AssignmentStatement":
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

export function execCall(ctx: CallContext, state: State) {
  if (ctx.phase === "init") {
    ctx.phase = "targetcomputed";
    state.execStack.push(initCtx(ctx.node.target));
    return;
  }

  if (ctx.phase === "targetcomputed") {
    ctx.target = state.acc.val;
    if (ctx.node.arguments.length > 0) {
      ctx.phase = "argcomputed";
      state.execStack.push(initCtx(ctx.node.arguments[0]));
    } else {
      ctx.phase = "callready";
    }
    return;
  }
  if (ctx.phase === "argcomputed") {
    ctx.args.push(state.acc.val);

    if (ctx.args.length < ctx.node.arguments.length) {
      state.execStack.push(initCtx(ctx.node.arguments[ctx.args.length]));
    } else {
      ctx.phase = "callready";
    }
    return;
  }

  if (ctx.phase === "callready") {
    const fnValue = state.heap.get(ctx.target!);
    if (fnValue.type === "builtinfunction") {
      state.acc.val = fnValue.impl(ctx.args);
      state.execStack.pop();
    } else if (fnValue.type === "function") {
      const newEnv = new LexicalEnvironment(fnValue.parentEnv);
      fnValue.node.params?.forEach((param, i) => {
        newEnv.set(param.name, ctx.args[i] ?? state.heap.set({ type: "null" }));
      });
      state.callStack.push(fnValue.node.name, fnValue.node.body, newEnv);
      state.execStack.push(initCtx(fnValue.node.body));
    } else {
      throw new Error(`Target is not a function: ${fnValue.type}`);
    }
    return;
  }

  if (ctx.phase === "done") {
    state.callStack.pop();
    if (state.acc.isReturn) {
      state.acc.isReturn = false;
    } else {
      state.acc.val = state.heap.set({ type: "null" });
    }
    state.execStack.pop();
  }
}

export function exec(ctx: Context, state: State) {
  if (state.acc.isReturn && ctx.type !== "Call") {
    state.execStack.pop();
    return;
  }

  switch (ctx.type) {
    case "Block":
      return execBlock(ctx, state);
    case "ExpressionStatement":
      return execExpressionStatement(ctx, state);
    case "Primitive":
      return execPrimitive(ctx, state);
    case "Call":
      return execCall(ctx, state);
    default:
      break;
  }
}
