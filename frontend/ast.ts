import { TokenLocation } from "./tokenizer";

interface BaseNode {
  id: string;
  loc: TokenLocation;
}

export interface Block extends BaseNode {
  type: "Block";
  statements: Statement[];
}

export type Statement =
  | IfStatement
  | WhileLoop
  | FunctionDeclaration
  | ReturnStatement;

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

export interface FunctionDeclaration extends BaseNode {
  type: "FunctionDeclaration";
  name: string;
  params?: Identifier[];
  body: Block;
}

export interface ReturnStatement extends BaseNode {
  type: "ReturnStatement";
  expression?: Expression;
}

export interface BooleanLiteral extends BaseNode {
  type: "BooleanLiteral";
  value: boolean;
}

export interface Identifier extends BaseNode {
  type: "Identifier";
  name: string;
}
export type Atom = BooleanLiteral | Identifier;
export type Expression = Atom;

type ASTNode = Statement | Expression;
