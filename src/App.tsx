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
  heap: HeapSnapshot;
  stack: DiagnosticFrame[];
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
    <div style={{ display: "flex" }}>
      <div>
        <Code
          code={codeState.code}
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
                  heap: next.heap,
                  stack: next.stack,
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
                  heap: next.heap,
                  stack: next.stack,
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
      </div>

      <Output
        printed={codeState.printed}
        onClear={() => {
          setCodeState((state) => ({ ...state, printed: [] }));
        }}
      />
    </div>
  );
}

export default App;
