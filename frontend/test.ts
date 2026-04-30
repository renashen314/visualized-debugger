import { Tokenizer } from "./tokenizer.ts";
const program = `while (true) { 
  if (1 + 2 == 3) {
    print("Hello, world!");
  }
}`;

const tokenizer = new Tokenizer(program);
const tokens = tokenizer.tokenize();
console.log(JSON.stringify(tokens));
