import { Parser } from "./parser.ts";
import { Tokenizer, TokenManager } from "./tokenizer.ts";

const program = `
fn main() {
  count = 0;

  while (count < 10) {
    count = count + 1;
    print(count);
  }
}
main();
`;

const tokenizer = new Tokenizer(program);
const tokens = new TokenManager(tokenizer.tokenize());
const parser = new Parser(tokens);

console.log(JSON.stringify(parser.parse()));
