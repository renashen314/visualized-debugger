import { executor } from "../backend/run.ts";
import { Parser } from "./parser.ts";
import { Tokenizer, TokenManager } from "./tokenizer.ts";

const program = `
fn outer(init) {
  fn get() {
    return init;
  }
  return get;
}
o1 = outer(0);
o2 = outer(10);
print(o1());
print(o2());
`;

const tokenizer = new Tokenizer(program);

const tokens = new TokenManager(tokenizer.tokenize());
const parser = new Parser(tokens);

const ast = parser.parse();

const exec = executor(ast);

console.log(exec.advance());
