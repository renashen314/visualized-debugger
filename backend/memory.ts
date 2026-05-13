import { uuid } from "../utils.ts";
import type { ASTNode, FunctionDeclaration } from "../frontend/ast.ts";

export type Pointer = string;

type NullValue = { type: "null" };
type NumberValue = { type: "number"; value: number };
type StringValue = { type: "string"; value: string };
type BooleanValue = { type: "boolean"; value: boolean };

export type ArrayValue = { type: "array"; elements: Pointer[] };
export type ObjectValue = {
  type: "object";
  properties: Record<string, Pointer>;
};

type FunctionValue =
  | { type: "builtinfunction"; impl: (args: Pointer[]) => Pointer }
  | {
      type: "function";
      node: FunctionDeclaration;
      parentEnv: LexicalEnvironment;
    };

export type PrimitiveValue =
  | NullValue
  | NumberValue
  | StringValue
  | BooleanValue;

export type RuntimeValue =
  | PrimitiveValue
  | ArrayValue
  | ObjectValue
  | FunctionValue;

export function isPrimitive(v: RuntimeValue): v is PrimitiveValue {
  return (
    v.type === "boolean" ||
    v.type === "number" ||
    v.type === "string" ||
    v.type === "null"
  );
}

export function coerceStr(v: PrimitiveValue): string {
  switch (v.type) {
    case "string":
      return v.value;
    case "number":
    case "boolean":
      return String(v.value);
    case "null":
      return "null";
  }
}

export function isTruthy(v: RuntimeValue) {
  if (v.type === "string" && v.value === "") {
    return false;
  }
  if (v.type === "number" && v.value === 0) {
    return false;
  }
  if (v.type === "null") {
    return false;
  }
  if (v.type === "boolean" && !v.value) {
    return false;
  }
  return true;
}

export function isPrimitiveEqual(
  a: PrimitiveValue,
  b: PrimitiveValue,
): boolean {
  if (a.type === "number" && b.type === "number") {
    return a.value === b.value;
  }

  if (a.type === "string" && b.type === "string") {
    return a.value === b.value;
  }

  if (a.type === "boolean" && b.type === "boolean") {
    return a.value === b.value;
  }

  if (a.type === "null" && b.type === "null") {
    return true;
  }
  return false;
}

export class Heap {
  private readonly storage: Record<Pointer, RuntimeValue> = {};
  set(value: RuntimeValue) {
    const pointer = uuid();
    this.storage[pointer] = value;
    return pointer;
  }

  get(pointer: Pointer) {
    const value = this.storage[pointer];
    if (value === undefined) {
      throw new Error(`Segmentation fault: invalid pointer ${pointer}`);
    }
    return value;
  }

  all(): Record<Pointer, RuntimeValue> {
    return this.storage;
  }
}

export type VarName = string;

export class LexicalEnvironment {
  private readonly variables: Record<VarName, Pointer> = {};
  private readonly parent?: LexicalEnvironment;

  constructor(parent?: LexicalEnvironment) {
    this.parent = parent;
  }

  set(name: string, pointer: Pointer) {
    this.variables[name] = pointer;
  }

  get(name: string): Pointer | undefined {
    const pointer = this.variables[name];
    if (pointer !== undefined) {
      return pointer;
    }
    if (this.parent) {
      return this.parent?.get(name);
    }
  }

  all(): Record<VarName, Pointer> {
    return this.variables;
  }
}

interface Frame {
  id: string;
  fn: string;
  curr: ASTNode;
  env: LexicalEnvironment;
}

export class CallStack {
  private readonly frames: Frame[] = [];

  push(fn: string, curr: ASTNode, env: LexicalEnvironment) {
    this.frames.push({ id: uuid(), fn, curr, env });
  }
  pop() {
    return this.frames.pop();
  }
  peek(): Frame {
    return this.frames[this.frames.length - 1];
  }

  all(): Frame[] {
    return this.frames;
  }
}
