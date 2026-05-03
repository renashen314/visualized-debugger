import { TokenLocation } from "./tokenizer";

interface BaseNode {
  id: string;
  loc: TokenLocation;
}

export interface Block extends BaseNode {
  type: "Block";
  statements: Statement[];
}

export type Statement = IfStatement | WhileLoop;

export interface IfStatement extends BaseNode {
  type: "IfStatement";
  condition: Expression;
  elseIfs?: ElseIf[];
  else?: Block;
  body: Block;
}

export interface ElseIf extends BaseNode {
  type: "ElseIf";
  condition: Expression;
  body: Block;
}

export interface WhileLoop extends BaseNode {
  type: "WhileLoop";
  condition: Expression;
  body: Block;
}

export interface BooleanLiteral extends BaseNode {
  type: "BooleanLiteral";
  value: boolean;
}

export type Atom = BooleanLiteral;
export type Expression = Atom;

type ASTNode = Statement | Expression;
