import { Parser } from "./parser.ts";
import { Tokenizer, TokenManager } from "./tokenizer.ts";

const program = `
a = [1,2,3];
`;

const tokenizer = new Tokenizer(program);
const tokens = new TokenManager(tokenizer.tokenize());
const parser = new Parser(tokens);

console.log(JSON.stringify(parser.parse()));
