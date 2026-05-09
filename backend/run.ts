import { Heap, CallStack, LexicalEnvironment } from "./memory.ts";
import type { ASTNodeId, Block } from "../frontend/ast.ts";
import { exec, initCtx } from "./exec.ts";
import type { Accumulator, Context } from "./context.ts";

interface Config {
  program: Block;
  heap: Heap;
  callStack: CallStack;
  printed: string[];
}

class Executor {
  private readonly heap: Heap;
  private readonly callStack: CallStack;
  private readonly execStack: Context[];
  private readonly printed: string[];
  private readonly breakpoints: Set<ASTNodeId> = new Set();

  private readonly acc: Accumulator;

  constructor(config: Config) {
    this.heap = config.heap;
    this.callStack = config.callStack;
    this.printed = config.printed;
    this.execStack = [initCtx(config.program)];

    this.acc = { val: this.heap.set({ type: "null" }) };
  }

  addBreakpoint(id: ASTNodeId) {
    return this.breakpoints.add(id);
  }

  clearBreakpoints() {
    return this.breakpoints.clear();
  }

  advance() {
    while (this.execStack.length > 0) {
      const curr = this.execStack[this.execStack.length - 1];
      if (this.breakpoints.has(curr.node.id)) {
        return this.state;
      }
      exec(curr, {
        heap: this.heap,
        callStack: this.callStack,
        execStack: this.execStack,
        acc: this.acc,
      });
    }
  }

  private state() {
    throw new Error("todo");
  }
}

export function executor(program: Block): Executor {
  const printed: string[] = [];

  const heap = new Heap();
  const builtinEnv = new LexicalEnvironment();
  const globalEnv = new LexicalEnvironment(builtinEnv);
  const callStack = new CallStack();

  callStack.push("", program, globalEnv);

  return new Executor({
    program,
    heap,
    callStack,
    printed,
  });
}
