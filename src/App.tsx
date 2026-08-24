import { useRef, useState } from "react";
import { Code } from "./Code";
import { Output } from "./Output";
import { Controls } from "./Controls";
import { Tokenizer, TokenManager } from "./interpreter/frontend/tokenizer";
import { Parser } from "./interpreter/frontend/parser";
import { Executor, executor } from "./interpreter/backend/run";
import type { ASTNode, ASTNodeId, Block } from "./interpreter/frontend/ast";
import type {
  DiagnosticFrame,
  HeapSnapshot,
} from "./interpreter/backend/diagnostics";
import { Stack, type FrameId } from "./Stack";
import type { Pointer } from "./interpreter/backend/memory";

function getNodeBreakpoints(
  breakpoints: number[],
  program: Block,
): ASTNodeId[] {
  const remaining = new Set(breakpoints);
  const nodes = new Set<ASTNodeId>();

  const walk = (node: ASTNode) => {
    switch (node.type) {
      case "Block":
        for (const stmt of node.statements) {
          if (remaining.has(stmt.loc.start.line)) {
            nodes.add(stmt.id);
            remaining.delete(stmt.loc.start.line);
          }
          walk(stmt);
        }
        break;
      case "IfStatement":
        walk(node.body);
        for (const elseif of node.elseIfs) {
          walk(elseif.body);
        }
        if (node.else) {
          walk(node.else);
        }
        break;
      case "WhileLoop":
      case "FunctionDeclaration":
        walk(node.body);
        break;
    }
  };

  walk(program);
  return Array.from(nodes);
}

interface BaseState {
  code: string;
  breakpoints: number[];
  printed: string[];
}
interface Idle extends BaseState {
  type: "idle";
}
interface Executing extends BaseState {
  type: "executing";
  program: Block;
  curr: number;
  heap: HeapSnapshot;
  stack: DiagnosticFrame[];
  expanded: Record<FrameId, Record<Pointer, boolean>>;
}

function App() {
  const executorRef = useRef<Executor>(null);
  const [codeState, setCodeState] = useState<Idle | Executing>({
    type: "idle",
    code: "\n\n\n",
    breakpoints: [],
    printed: [],
  });

  return (
    <div className="app-container">
      <div className="left-pane">
        <Code
          highlight={
            codeState.type === "executing"
              ? {
                  from: codeState.stack[codeState.curr].loc.start.i,
                  to: codeState.stack[codeState.curr].loc.end.i,
                }
              : undefined
          }
          code={codeState.code}
          readonly={codeState.type === "executing"}
          onChange={(code) => {
            setCodeState((state) => ({ ...state, code }));
          }}
          onBreakpoint={(bps) => {
            if (executorRef.current && codeState.type === "executing") {
              executorRef.current.clearBreakpoints();
              for (const id of getNodeBreakpoints(bps, codeState.program)) {
                executorRef.current.addBreakpoint(id);
              }
            }
            setCodeState((state) => ({ ...state, breakpoints: bps }));
          }}
        />
        <Controls
          onRun={() => {
            if (codeState.type === "idle") {
              const tokens = new TokenManager(
                new Tokenizer(codeState.code).tokenize(),
              );
              const parser = new Parser(tokens);
              const program = parser.parse();

              executorRef.current = executor(program);

              for (const id of getNodeBreakpoints(
                codeState.breakpoints,
                program,
              )) {
                executorRef.current.addBreakpoint(id);
              }

              const next = executorRef.current.advance();
              if (next.finished) {
                setCodeState({
                  type: "idle",
                  code: codeState.code,
                  breakpoints: codeState.breakpoints,
                  printed: [...codeState.printed, ...next.printed],
                });
                executorRef.current = null;
              } else {
                setCodeState({
                  type: "executing",
                  code: codeState.code,
                  breakpoints: codeState.breakpoints,
                  printed: [...codeState.printed, ...next.printed],
                  program: program,
                  curr: next.stack.length - 1,
                  heap: next.heap,
                  stack: next.stack,
                  expanded: {},
                });
              }
            }
            if (codeState.type === "executing") {
              const next = executorRef.current!.advance();
              if (next.finished) {
                executorRef.current = null;
                setCodeState({
                  type: "idle",
                  printed: [...codeState.printed, ...next.printed],
                  code: codeState.code,
                  breakpoints: codeState.breakpoints,
                });
              } else {
                setCodeState({
                  type: "executing",
                  printed: [...codeState.printed, ...next.printed],
                  code: codeState.code,
                  breakpoints: codeState.breakpoints,
                  program: codeState.program,
                  curr: next.stack.length - 1,
                  heap: next.heap,
                  stack: next.stack,
                  expanded: codeState.expanded,
                });
              }
            }
          }}
          onStop={
            codeState.type === "executing"
              ? () => {
                  executorRef.current = null;
                  setCodeState({
                    type: "idle",
                    printed: codeState.printed,
                    code: codeState.code,
                    breakpoints: codeState.breakpoints,
                  });
                }
              : undefined
          }
        />
        <div className="out-pane">
          <Output
            printed={codeState.printed}
            onClear={() => {
              setCodeState((state) => ({ ...state, printed: [] }));
            }}
          />
        </div>
      </div>
      <Stack
        heap={codeState.type === "idle" ? {} : codeState.heap}
        stack={
          codeState.type === "idle"
            ? []
            : codeState.stack.map((frame) => ({
                ...frame,
                expanded: codeState.expanded?.[frame.id] ?? [],
              }))
        }
        curr={codeState.type === "idle" ? -1 : codeState.curr}
        onExpand={(id, ptr) => {
          setCodeState((state) => {
            if (state.type === "executing") {
              const expanded = { ...state.expanded };
              if (!expanded[id]) {
                expanded[id] = {};
              } else {
                expanded[id] = { ...expanded[id] };
              }
              expanded[id][ptr] = !expanded[id][ptr];
              return {
                ...state,
                expanded,
              };
            }
            return state;
          });
        }}
        onCurr={(curr) => {
          setCodeState((state) => {
            if (codeState.type === "executing") {
              return { ...state, curr };
            }
            return state;
          });
        }}
      />
    </div>
  );
}

export default App;
