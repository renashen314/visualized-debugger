import { Heap, CallStack, LexicalEnvironment, type Pointer } from "./memory.ts";
import type { ASTNodeId, Block } from "../frontend/ast.ts";
import { exec, initCtx } from "./exec.ts";
import type { Accumulator, Context } from "./context.ts";
import { printAny } from "./builtin.ts";

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

    this.acc = { val: this.heap.set({ type: "null" }), isReturn: false };
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
      if (this.breakpoints.has(curr.node.id) && !curr.isBreakpointed) {
        curr.isBreakpointed = true;
        return this.state;
      }
      exec(curr, {
        heap: this.heap,
        callStack: this.callStack,
        execStack: this.execStack,
        acc: this.acc,
      });
    }
    return this.state();
  }

  private state(): string[] {
    const printed = [...this.printed];
    this.printed.length = 0;
    return printed;
  }
}

export function executor(program: Block): Executor {
  const printed: string[] = [];
  const heap = new Heap();
  const builtinEnv = new LexicalEnvironment();

  const printPointer = heap.set({
    type: "builtinfunction",
    impl: (args: Pointer[]) => {
      const strs: string[] = [];
      for (const argptr of args) {
        strs.push(printAny(heap, heap.get(argptr)));
      }
      printed.push(strs.join(" "));
      return heap.set({ type: "null" });
    },
  });

  const globalEnv = new LexicalEnvironment(builtinEnv);
  globalEnv.set("print", printPointer);

  const callStack = new CallStack();

  callStack.push("", program, globalEnv);

  return new Executor({
    program,
    heap,
    callStack,
    printed,
  });
}
