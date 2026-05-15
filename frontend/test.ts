import { executor } from "../backend/run.ts";
import { Parser } from "./parser.ts";
import { Tokenizer, TokenManager } from "./tokenizer.ts";

const program = `
print([
{
  k: [1,2,3]
}][0].k[2]);
`;

const tokenizer = new Tokenizer(program);

const tokens = new TokenManager(tokenizer.tokenize());
const parser = new Parser(tokens);

const ast = parser.parse();

const exec = executor(ast);

console.log(exec.advance());
