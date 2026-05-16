import { executor } from "../backend/run.ts";
import { Parser } from "./parser.ts";
import { Tokenizer, TokenManager } from "./tokenizer.ts";

const program = `
arr = [1,2,3, {
foo: {
  bar:[10,11,12]
    }
  }
];
arr[3].foo.bar[0] = 200;
print(arr);
`;

const tokenizer = new Tokenizer(program);

const tokens = new TokenManager(tokenizer.tokenize());
const parser = new Parser(tokens);

const ast = parser.parse();

const exec = executor(ast);

console.log(exec.advance());
