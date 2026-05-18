import { useState } from "react";
import { Code } from "./Code";
import { Output } from "./Output";
import { Controls } from "./Controls";
import { Tokenizer, TokenManager } from "./interpreter/frontend/tokenizer";
import { Parser } from "./interpreter/frontend/parser";
import { executor } from "./interpreter/backend/run";

interface BaseState {
  code: string;
  printed: string[];
}

function App() {
  const [codeState, setCodeState] = useState<BaseState>({
    code: "\n\n\n",
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
        />
        <Controls
          onRun={() => {
            const tokens = new TokenManager(
              new Tokenizer(codeState.code).tokenize(),
            );
            const parser = new Parser(tokens);
            const ast = parser.parse();

            const exec = executor(ast);

            const printed = exec.advance();

            setCodeState((state) => ({ ...state, printed }));
          }}
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
