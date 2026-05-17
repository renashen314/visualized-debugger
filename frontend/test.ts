import { executor } from "../backend/run.ts";
import { Parser } from "./parser.ts";
import { Tokenizer, TokenManager } from "./tokenizer.ts";

const program = `
if(false) {
    print("true");
  } else if(false) {
    print("elseif1");
  } else if (true) {
    print("elseif2");
  } else {
      print("else");
    }
`;

const tokenizer = new Tokenizer(program);

const tokens = new TokenManager(tokenizer.tokenize());
const parser = new Parser(tokens);

const ast = parser.parse();

const exec = executor(ast);

console.log(exec.advance());
