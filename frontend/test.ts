import { executor } from "../backend/run.ts";
import { Parser } from "./parser.ts";
import { Tokenizer, TokenManager } from "./tokenizer.ts";

// const program = `
// print({"a": 1, "b": 2});
// print(["hello", 123,"world"]);
// print(["hello", 1, 2]);
// print({"a": 1, abc: 123, 123: "a"});
// `;
const program = `
print([] == []);
`;

const tokenizer = new Tokenizer(program);

const tokens = new TokenManager(tokenizer.tokenize());
const parser = new Parser(tokens);

const ast = parser.parse();

const exec = executor(ast);
exec.addBreakpoint("3");
exec.addBreakpoint("7");

const printed = exec.advance();

console.log(exec.advance());
