import { Parser } from "./parser.ts";
import { Tokenizer, TokenManager } from "./tokenizer.ts";
// const program = `while (true) {
//   if (true) {
//
//   }
// }`;
const program = `while (true) { 
while(true){
  if (true) {
    if (false) {}
    else if (true) {
    while(true){}
    } else if (false) {}
    else {}
  }
  }
  if(true) {
  }
}`;

const tokenizer = new Tokenizer(program);
const tokens = new TokenManager(tokenizer.tokenize());
const parser = new Parser(tokens);

console.log(JSON.stringify(parser.parse(), null, 2));
