import { executor } from "../backend/run.ts";
import { Parser } from "./parser.ts";
import { Tokenizer, TokenManager } from "./tokenizer.ts";

const program = `
print("hello");
print(123.21);
`;

const tokenizer = new Tokenizer(program);

const tokens = new TokenManager(tokenizer.tokenize());
const parser = new Parser(tokens);

const ast = parser.parse();

const exec = executor(ast);
const printed = exec.advance();

console.log(printed);
