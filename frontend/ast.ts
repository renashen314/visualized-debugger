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
  | ReturnStatement
  | ExpressionStatement
  | AssignmentStatement;

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

export interface StringLiteral extends BaseNode {
  type: "StringLiteral";
  value: string;
}

export interface NumberLiteral extends BaseNode {
  type: "NumberLiteral";
  value: number;
}

export interface NullLiteral extends BaseNode {
  type: "NullLiteral";
}

export type Primitive =
  | BooleanLiteral
  | Identifier
  | StringLiteral
  | NumberLiteral
  | NullLiteral;

export interface ParenthesizedExpression extends BaseNode {
  type: "ParenthesizedExpression";
  expression: Expression;
}

export interface ArrayLiteral extends BaseNode {
  type: "ArrayLiteral";
  elements: Expression[];
}

export interface ExpressionKey {
  type: "ExpressionKey";
  expression: Expression;
}

export interface BinaryExpression extends BaseNode {
  type: "BinaryExpression";
  left: Expression;
  operator:
    | "+"
    | "-"
    | "*"
    | "/"
    | "%"
    | "&&"
    | "||"
    | "<"
    | ">"
    | "<="
    | ">="
    | "=="
    | "!=";
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  type: "UnaryExpression";
  operator: "!" | "-" | "+";
  argument: Expression;
}

export interface PropAccess extends BaseNode {
  type: "PropAccess";
  target: Expression;
  property: Identifier;
}

export interface ElementAccess extends BaseNode {
  type: "ElementAccess";
  target: Expression;
  index: Expression;
}

export interface Call extends BaseNode {
  type: "Call";
  target: Expression;
  arguments: Expression[];
}

type Access = PropAccess | ElementAccess;
type AccessOrCall = Access | Call;

export interface IdentifierKey {
  type: "IdentifierKey";
  identifier: Identifier;
}

type Key = ExpressionKey | IdentifierKey;

export type KVPair = [Key, Expression];
export interface ObjectLiteral extends BaseNode {
  type: "ObjectLiteral";
  pairs: KVPair[];
}

export type RefType = ArrayLiteral | ObjectLiteral;

export type Atom = Primitive | ParenthesizedExpression | RefType;

export type Expression =
  | Atom
  | BinaryExpression
  | UnaryExpression
  | AccessOrCall;

export interface AssignmentStatement extends BaseNode {
  type: "AssignmentStatement";
  left: Expression;
  right: Expression;
}

export interface ExpressionStatement extends BaseNode {
  type: "ExpressionStatement";
  expression: Expression;
}

type ASTNode =
  | Statement
  | Expression
  | AssignmentStatement
  | ExpressionStatement;
