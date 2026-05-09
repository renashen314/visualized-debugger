import { executor } from "../backend/run.ts";
import { Parser } from "./parser.ts";
import { Tokenizer, TokenManager } from "./tokenizer.ts";

const program = `
"hello";
123.21;
`;

const tokenizer = new Tokenizer(program);
const tokens = new TokenManager(tokenizer.tokenize());
const parser = new Parser(tokens);
const exec = executor(parser.parse());
exec.advance();
