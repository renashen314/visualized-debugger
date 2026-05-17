import type {
  ArrayLiteral,
  ASTNode,
  ElementAccess,
  Identifier,
  PropAccess,
  UnaryExpression,
} from "../frontend/ast.ts";
import { uuid } from "../utils.ts";
import type {
  Accumulator,
  ArrayLiteralContext,
  BinaryExpressionContext,
  BlockContext,
  CallContext,
  Context,
  ElemAccessAssignmentContext,
  ElementAccessContext,
  ExpressionStatementContext,
  FunctionDeclarationContext,
  IdentifierAssignmentContext,
  ObjectLiteralContext,
  ParenthesizedExpresionContext,
  PrimitiveContext,
  PropAccessAssignmentContext,
  PropAccessContext,
  ReturnStatementContext,
  UnaryExpressionContext,
  WhileloopContext,
} from "./context.ts";
import {
  coerceStr,
  isPrimitive,
  isPrimitiveEqual,
  isTruthy,
  LexicalEnvironment,
  type Pointer,
  type CallStack,
  type Heap,
} from "./memory.ts";

export function initCtx(node: ASTNode): Context {
  switch (node.type) {
    case "Block":
      return { type: "Block", node, pc: 0 };
    case "AssignmentStatement":
      if (node.left.type === "Identifier") {
        return { type: "IdentifierAssignment", node, phase: "init" };
      }
      if (node.left.type === "PropAccess") {
        return { type: "PropAccessAssignment", node, phase: "init" };
      }
      if (node.left.type === "ElementAccess") {
        return { type: "ElemAccessAssignment", node, phase: "init" };
      }
      throw new Error(`Unexpected assignment targer: ${node.left.type}`);
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
    case "ParenthesizedExpression":
      return { type: "ParenthesizedExpression", node, phase: "init" };
    case "ArrayLiteral":
      return { type: "ArrayLiteral", node, phase: "init", elems: [] };
    case "ObjectLiteral":
      return { type: "ObjectLiteral", node, phase: "init", pairs: [] };
    case "BinaryExpression":
      return { type: "BinaryExpression", node, phase: "init" };
    case "UnaryExpression":
      return { type: "UnaryExpression", node, phase: "init" };
    case "PropAccess":
      return { type: "PropAccess", node, phase: "init" };
    case "ElementAccess":
      return { type: "ElementAccess", node, phase: "init" };
    case "FunctionDeclaration":
      return { type: "FunctionDeclaration", node };
    case "ReturnStatement":
      return { type: "ReturnStatement", node, phase: "init" };
    case "WhileLoop":
      return { type: "Whileloop", node, phase: "init" };
    case "IfStatement":
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
      ctx.phase = "done";
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

export function execParenthesizedExpression(
  ctx: ParenthesizedExpresionContext,
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

function execArrayLiteral(ctx: ArrayLiteralContext, state: State) {
  if (ctx.phase === "init") {
    if (ctx.node.elements.length === 0) {
      ctx.phase = "done";
    } else {
      ctx.phase = "elemscomputed";
      state.execStack.push(initCtx(ctx.node.elements[0]));
    }
    return;
  }

  if (ctx.phase === "elemscomputed") {
    ctx.elems.push(state.acc.val);
    if (ctx.elems.length < ctx.node.elements.length) {
      state.execStack.push(initCtx(ctx.node.elements[ctx.elems.length]));
    } else {
      ctx.phase = "done";
    }
    return;
  }
  if (ctx.phase === "done") {
    state.acc.val = state.heap.set({ type: "array", elements: ctx.elems });
    state.execStack.pop();
    return;
  }
}

export function execObjectLiteral(ctx: ObjectLiteralContext, state: State) {
  if (ctx.phase === "init") {
    if (ctx.node.pairs.length === 0) {
      ctx.phase = "done";
    } else {
      ctx.phase = "keycomputed";
      const key = ctx.node.pairs[0][0];
      if (key.type === "ExpressionKey") {
        state.execStack.push(initCtx(key.expression));
      }
      if (key.type === "IdentifierKey") {
        state.execStack.push(
          initCtx({
            id: uuid(),
            type: "StringLiteral",
            value: key.identifier.name,
            loc: key.identifier.loc,
          }),
        );
      }
    }
    return;
  }
  if (ctx.phase === "keycomputed") {
    const keyVal = state.heap.get(state.acc.val);
    if (!isPrimitive(keyVal)) {
      throw new Error(`Object key must be primitive, but got ${keyVal.type}`);
    }
    ctx.key = keyVal.type === "string" ? keyVal.value : coerceStr(keyVal);
    ctx.phase = "valuecomputed";
    state.execStack.push(initCtx(ctx.node.pairs[ctx.pairs.length][1]));
    return;
  }
  if (ctx.phase === "valuecomputed") {
    ctx.pairs.push([ctx.key!, state.acc.val]);
    if (ctx.pairs.length < ctx.node.pairs.length) {
      ctx.phase = "keycomputed";
      const key = ctx.node.pairs[ctx.pairs.length][0];
      if (key.type === "ExpressionKey") {
        state.execStack.push(initCtx(key.expression));
      }
      if (key.type === "IdentifierKey") {
        state.execStack.push(
          initCtx({
            id: uuid(),
            type: "StringLiteral",
            value: key.identifier.name,
            loc: key.identifier.loc,
          }),
        );
      }
    } else {
      ctx.phase = "done";
    }
    return;
  }

  if (ctx.phase === "done") {
    state.acc.val = state.heap.set({
      type: "object",
      properties: Object.fromEntries(ctx.pairs),
    });
    state.execStack.pop();
    return;
  }
}

export function execBinaryExpression(
  ctx: BinaryExpressionContext,
  state: State,
) {
  if (ctx.phase === "init") {
    ctx.phase = "lhscomputed";
    state.execStack.push(initCtx(ctx.node.left));
    return;
  }

  if (ctx.phase === "lhscomputed") {
    ctx.left = state.acc.val;
    const leftVal = state.heap.get(ctx.left);
    if (ctx.node.operator === "&&" && !isTruthy(leftVal)) {
      state.acc.val = state.heap.set({ type: "boolean", value: false });
      state.execStack.pop();
      return;
    }
    if (ctx.node.operator === "||" && isTruthy(leftVal)) {
      state.acc.val = state.heap.set({ type: "boolean", value: true });
      state.execStack.pop();
      return;
    }
    ctx.phase = "rhscomputed";
    state.execStack.push(initCtx(ctx.node.right));
    return;
  }
  if (ctx.phase === "rhscomputed") {
    const lptr = ctx.left!;
    const rptr = state.acc.val;
    const leftVal = state.heap.get(lptr);
    const rightVal = state.heap.get(rptr);
    let result: Pointer;
    switch (ctx.node.operator) {
      case "+":
        if (leftVal.type === "number" && rightVal.type === "number") {
          result = state.heap.set({
            type: "number",
            value: leftVal.value + rightVal.value,
          });
        } else if (leftVal.type === "string" && rightVal.type === "string") {
          result = state.heap.set({
            type: "string",
            value: leftVal.value + rightVal.value,
          });
        } else {
          throw new Error(
            `Invalid operands for +: ${leftVal.type} and ${rightVal.type}`,
          );
        }
        break;
      case "-":
        if (leftVal.type !== "number" || rightVal.type !== "number") {
          throw new Error(
            `Invalid operands for -: ${leftVal.type} and ${rightVal.type}`,
          );
        }
        result = state.heap.set({
          type: "number",
          value: leftVal.value - rightVal.value,
        });
        break;
      case "*":
        if (leftVal.type !== "number" || rightVal.type !== "number")
          throw new Error("Operands must be numbers");
        result = state.heap.set({
          type: "number",
          value: leftVal.value * rightVal.value,
        });
        break;
      case "/":
        if (leftVal.type !== "number" || rightVal.type !== "number")
          throw new Error("Operands must be numbers");
        result = state.heap.set({
          type: "number",
          value: leftVal.value / rightVal.value,
        });
        break;
      case "%":
        if (leftVal.type !== "number" || rightVal.type !== "number")
          throw new Error("Operands must be numbers");
        result = state.heap.set({
          type: "number",
          value: leftVal.value % rightVal.value,
        });
        break;
      case ">":
        if (leftVal.type !== "number" || rightVal.type !== "number")
          throw new Error("Operands must be numbers");
        result = state.heap.set({
          type: "boolean",
          value: leftVal.value > rightVal.value,
        });
        break;
      case "<":
        if (leftVal.type !== "number" || rightVal.type !== "number")
          throw new Error("Operands must be numbers");
        result = state.heap.set({
          type: "boolean",
          value: leftVal.value < rightVal.value,
        });
        break;
      case ">=":
        if (leftVal.type !== "number" || rightVal.type !== "number")
          throw new Error("Operands must be numbers");
        result = state.heap.set({
          type: "boolean",
          value: leftVal.value >= rightVal.value,
        });
        break;
      case "<=":
        if (leftVal.type !== "number" || rightVal.type !== "number")
          throw new Error("Operands must be numbers");
        result = state.heap.set({
          type: "boolean",
          value: leftVal.value <= rightVal.value,
        });
        break;
      case "==":
        if (lptr === rptr) {
          result = state.heap.set({ type: "boolean", value: true });
        } else {
          if (isPrimitive(leftVal) && isPrimitive(rightVal)) {
            result = state.heap.set({
              type: "boolean",
              value: isPrimitiveEqual(leftVal, rightVal),
            });
          } else {
            result = state.heap.set({ type: "boolean", value: false });
          }
        }
        break;
      case "!=":
        if (lptr === rptr) {
          result = state.heap.set({ type: "boolean", value: false });
        } else {
          if (isPrimitive(leftVal) && isPrimitive(rightVal)) {
            result = state.heap.set({
              type: "boolean",
              value: !isPrimitiveEqual(leftVal, rightVal),
            });
          } else {
            result = state.heap.set({ type: "boolean", value: true });
          }
        }
        break;
      case "&&":
        result = state.heap.set({
          type: "boolean",
          value: isTruthy(leftVal) && isTruthy(rightVal),
        });
        break;
      case "||":
        result = state.heap.set({
          type: "boolean",
          value: isTruthy(leftVal) || isTruthy(rightVal),
        });
        break;
    }

    state.acc.val = result;
    state.execStack.pop();
    return;
  }
}

export function execUnaryExpression(ctx: UnaryExpressionContext, state: State) {
  if (ctx.phase === "init") {
    ctx.phase = "argcomputed";
    state.execStack.push(initCtx(ctx.node.argument));
    return;
  }
  if (ctx.phase === "argcomputed") {
    const val = state.heap.get(state.acc.val);

    let result: Pointer;
    switch (ctx.node.operator) {
      case "!":
        result = state.heap.set({ type: "boolean", value: !isTruthy(val) });
        break;
      case "-":
        if (val.type !== "number")
          throw new Error(`Unary '-' expects a number, but got ${val.type} `);
        result = state.heap.set({ type: "number", value: -val.value });
        break;
      case "+":
        if (val.type !== "number")
          throw new Error(`Unary '+' expects a number, but got ${val.type} `);
        result = state.heap.set({ type: "number", value: val.value });
        break;
    }
    state.acc.val = result;
    state.execStack.pop();
    return;
  }
}

export function execPropAccess(ctx: PropAccessContext, state: State) {
  if (ctx.phase === "init") {
    ctx.phase = "targetcomputed";
    state.execStack.push(initCtx(ctx.node.target));
    return;
  }
  if (ctx.phase === "targetcomputed") {
    const targetVal = state.heap.get(state.acc.val);
    if (targetVal.type !== "object") {
      throw new Error(
        `Cannot access property ${ctx.node.property} of ${targetVal.type}`,
      );
    }
    const propPtr = targetVal.properties[ctx.node.property.name];
    state.acc.val = propPtr ?? state.heap.set({ type: "null" });
    state.execStack.pop();
    return;
  }
}

export function execElementAccess(ctx: ElementAccessContext, state: State) {
  if (ctx.phase === "init") {
    ctx.phase = "targetcomputed";
    state.execStack.push(initCtx(ctx.node.target));
    return;
  }
  if (ctx.phase === "targetcomputed") {
    ctx.target = state.acc.val;
    ctx.phase = "idxcomputed";
    state.execStack.push(initCtx(ctx.node.index));
    return;
  }
  if (ctx.phase === "idxcomputed") {
    const targetVal = state.heap.get(ctx.target!);
    const indexVal = state.heap.get(state.acc.val);

    if (targetVal.type === "array") {
      if (indexVal.type !== "number") {
        throw new Error(
          `Array index must be a number, but got ${indexVal.type}`,
        );
      }
      const element = targetVal.elements[indexVal.value];
      state.acc.val = element ?? state.heap.set({ type: "null" });
    } else if (targetVal.type === "object") {
      if (!isPrimitive(indexVal)) {
        throw new Error(
          `Object key must be a primitive, but got ${indexVal.type}`,
        );
      }
      const prop = targetVal.properties[coerceStr(indexVal)];
      state.acc.val = prop ?? state.heap.set({ type: "null" });
    } else {
      throw new Error(`Cannot access element of ${targetVal.type}`);
    }
    state.execStack.pop();
    return;
  }
}

export function execIdentifierAssignment(
  ctx: IdentifierAssignmentContext,
  state: State,
) {
  if (ctx.phase === "init") {
    ctx.phase = "rhscomputed";
    state.execStack.push(initCtx(ctx.node.right));
    return;
  }
  if (ctx.phase === "rhscomputed") {
    const { name } = ctx.node.left as Identifier;
    state.callStack.peek().env.set(name, state.acc.val);
    state.execStack.pop();
    return;
  }
}

export function execPropAccessAssignment(
  ctx: PropAccessAssignmentContext,
  state: State,
) {
  if (ctx.phase === "init") {
    ctx.phase = "rhscomputed";
    state.execStack.push(initCtx(ctx.node.right));
    return;
  }
  if (ctx.phase === "rhscomputed") {
    ctx.right = state.acc.val;
    ctx.phase = "targetcomputed";
    state.execStack.push(initCtx((ctx.node.left as PropAccess).target));
    return;
  }
  if (ctx.phase === "targetcomputed") {
    const targetVal = state.heap.get(state.acc.val);
    if (targetVal.type !== "object") {
      throw new Error(`Cannot set property of ${targetVal.type}`);
    }
    const { name } = (ctx.node.left as PropAccess).property;
    targetVal.properties[name] = ctx.right!;
    state.execStack.pop();
    return;
  }
}

export function execElemAccessAssignment(
  ctx: ElemAccessAssignmentContext,
  state: State,
) {
  if (ctx.phase === "init") {
    ctx.phase = "rhscomputed";
    state.execStack.push(initCtx(ctx.node.right));
    return;
  }
  if (ctx.phase === "rhscomputed") {
    ctx.right = state.acc.val;
    ctx.phase = "targetcomputed";
    state.execStack.push(initCtx((ctx.node.left as ElementAccess).target));
    return;
  }
  if (ctx.phase === "targetcomputed") {
    ctx.target = state.acc.val;
    ctx.phase = "idxcomputed";
    state.execStack.push(initCtx((ctx.node.left as ElementAccess).index));
    return;
  }
  if (ctx.phase === "idxcomputed") {
    const targetVal = state.heap.get(ctx.target!);
    const indexVal = state.heap.get(state.acc.val);
    if (targetVal.type === "array") {
      if (indexVal.type !== "number") {
        throw new Error(
          `Array index must be a number, but got ${indexVal.type}`,
        );
      }
      if (indexVal.value < 0 || indexVal.value >= targetVal.elements.length) {
        throw new Error(`Array index out of bounds`);
      }
      targetVal.elements[indexVal.value] = ctx.right!;
    } else if (targetVal.type === "object") {
      if (!isPrimitive(indexVal)) {
        throw new Error(
          `Object key must be primitive, but got ${indexVal.type}`,
        );
      }
      targetVal.properties[coerceStr(indexVal)] = ctx.right!;
    } else {
      throw new Error(`Cannot assign value to ${targetVal.type}`);
    }
    state.execStack.pop();
    return;
  }
}

export function execFunctionDeclaration(
  ctx: FunctionDeclarationContext,
  state: State,
) {
  const fnptr = state.heap.set({
    type: "function",
    node: ctx.node,
    parentEnv: state.callStack.peek().env,
  });
  state.callStack.peek().env.set(ctx.node.name, fnptr);
  state.execStack.pop();
}

export function execReturnStatement(ctx: ReturnStatementContext, state: State) {
  if (ctx.phase === "init") {
    ctx.phase = "done";
    if (ctx.node.expression) {
      state.execStack.push(initCtx(ctx.node.expression));
    } else {
      state.acc.val = state.heap.set({ type: "null" });
      state.execStack.pop();
    }
    return;
  }
  if (ctx.phase === "done") {
    state.acc.isReturn = true;
    state.execStack.pop();
    return;
  }
}

export function execWhileloop(ctx: WhileloopContext, state: State) {
  if (ctx.phase === "init") {
    ctx.phase = "condcomputed";
    state.execStack.push(initCtx(ctx.node.condition));
    return;
  }
  if (ctx.phase === "condcomputed") {
    if (!isTruthy(state.heap.get(state.acc.val))) {
      state.execStack.pop();
      return;
    }
    ctx.phase = "init";
    state.execStack.push(initCtx(ctx.node.body));
    return;
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
    case "ParenthesizedExpression":
      return execParenthesizedExpression(ctx, state);
    case "ArrayLiteral":
      return execArrayLiteral(ctx, state);
    case "ObjectLiteral":
      return execObjectLiteral(ctx, state);
    case "BinaryExpression":
      return execBinaryExpression(ctx, state);
    case "UnaryExpression":
      return execUnaryExpression(ctx, state);
    case "PropAccess":
      return execPropAccess(ctx, state);
    case "ElementAccess":
      return execElementAccess(ctx, state);
    case "IdentifierAssignment":
      return execIdentifierAssignment(ctx, state);
    case "PropAccessAssignment":
      return execPropAccessAssignment(ctx, state);
    case "ElemAccessAssignment":
      return execElemAccessAssignment(ctx, state);
    case "FunctionDeclaration":
      return execFunctionDeclaration(ctx, state);
    case "ReturnStatement":
      return execReturnStatement(ctx, state);
    case "Whileloop":
      return execWhileloop(ctx, state);
    default:
      break;
  }
}
