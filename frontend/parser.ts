import { type Token, TokenManager, type IdentifierToken } from "./tokenizer.ts";
import type {
  ArrayLiteral,
  AssignmentStatement,
  Atom,
  BinaryExpression,
  Block,
  ElseIf,
  Expression,
  ExpressionKey,
  ExpressionStatement,
  FunctionDeclaration,
  Identifier,
  IdentifierKey,
  IfStatement,
  KVPair,
  ObjectLiteral,
  ParenthesizedExpression,
  Primitive,
  ReturnStatement,
  Statement,
  WhileLoop,
} from "./ast";
import { uuid } from "../utils.ts";

function isPrimitiveLookahead(token: Token): boolean {
  return (
    token.type === "true" ||
    token.type === "false" ||
    token.type === "number" ||
    token.type === "string" ||
    token.type === "null" ||
    token.type === "identifier"
  );
}

function isKVPairLookahead(token: Token): boolean {
  return isPrimitiveLookahead(token) || token.type === "[";
}

function isAtomLookahead(token: Token): boolean {
  return (
    isPrimitiveLookahead(token) ||
    token.type === "(" ||
    token.type === "[" ||
    token.type === "{"
  );
}
function isExpressionLookahead(token: Token): boolean {
  return isAtomLookahead(token);
}

function isReturnStatementLookahead(token: Token): boolean {
  return token.type === "return";
}
function isFunctionDeclarationLookahead(token: Token): boolean {
  return token.type === "fn";
}

function isWhileLoopLookahead(token: Token): boolean {
  return token.type === "while";
}

function isIfStatementLookahead(token: Token): boolean {
  return token.type === "if";
}

function isStatementLookahead(token: Token): boolean {
  return (
    isWhileLoopLookahead(token) ||
    isIfStatementLookahead(token) ||
    isFunctionDeclarationLookahead(token) ||
    isReturnStatementLookahead(token) ||
    isExpressionLookahead(token)
  );
}

export class Parser {
  private readonly tokens: TokenManager;
  constructor(tokens: TokenManager) {
    this.tokens = tokens;
  }

  private block(): Block {
    const statements = [];
    while (isStatementLookahead(this.tokens.peek())) {
      statements.push(this.statement());
    }

    const loc =
      statements.length > 0
        ? {
            start: statements[0].loc.start,
            end: statements[statements.length - 1].loc.end,
          }
        : this.tokens.peek().loc;

    return {
      id: uuid(),
      type: "Block",
      statements,
      loc,
    };
  }

  private statement(): Statement {
    const token = this.tokens.peek();
    if (isIfStatementLookahead(token)) {
      return this.ifStatement();
    } else if (isWhileLoopLookahead(token)) {
      return this.whileLoop();
    } else if (isFunctionDeclarationLookahead(token)) {
      return this.functionDeclaration();
    } else if (isReturnStatementLookahead(token)) {
      return this.returnStatement();
    } else if (isExpressionLookahead(token)) {
      return this.assignmentOrExpressionStatement();
    } else {
      throw new Error(
        `Expected statement, but got ${token.type} at line ${token.loc.start.line}, col ${token.loc.start.col}`,
      );
    }
  }

  private assignmentOrExpressionStatement():
    | ExpressionStatement
    | AssignmentStatement {
    const left = this.expression();
    if (this.tokens.peek().type === "=") {
      this.tokens.consume("=");
      const right = this.expression();
      const { end } = this.tokens.consume(";").loc;
      return {
        id: uuid(),
        type: "AssignmentStatement",
        left,
        right,
        loc: { start: left.loc.start, end },
      };
    }

    const { end } = this.tokens.consume(";").loc;
    return {
      id: uuid(),
      type: "ExpressionStatement",
      expression: left,
      loc: { start: left.loc.start, end },
    };
  }

  private ifStatement(): IfStatement {
    const { start } = this.tokens.consume("if").loc;
    this.tokens.consume("(");
    const condition = this.expression();
    this.tokens.consume(")");
    this.tokens.consume("{");
    const body = this.block();
    let { end } = this.tokens.consume("}").loc;

    const elseIfs: ElseIf[] = [];
    let elseBranch: Block | undefined;

    while (this.tokens.peek().type === "else") {
      this.tokens.consume("else");
      if (this.tokens.peek().type === "if") {
        this.tokens.consume("if");
        this.tokens.consume("(");
        const elseIfCondition = this.expression();
        this.tokens.consume(")");
        this.tokens.consume("{");
        const elseIfBody = this.block();
        end = this.tokens.consume("}").loc.end;
        elseIfs.push({
          id: uuid(),
          type: "ElseIf",
          condition: elseIfCondition,
          body: elseIfBody,
          loc: { start, end },
        });
      } else {
        this.tokens.consume("{");
        elseBranch = this.block();
        end = this.tokens.consume("}").loc.end;
        break;
      }
    }

    return {
      id: uuid(),
      type: "IfStatement",
      condition,
      body,
      elseIfs,
      else: elseBranch,
      loc: { start, end },
    };
  }

  private whileLoop(): WhileLoop {
    const { start } = this.tokens.consume("while").loc;
    this.tokens.consume("(");
    const condition = this.expression();
    this.tokens.consume(")");
    this.tokens.consume("{");
    const body = this.block();
    const { end } = this.tokens.consume("}").loc;

    return {
      id: uuid(),
      type: "WhileLoop",
      condition,
      body,
      loc: { start, end },
    };
  }

  private returnStatement(): ReturnStatement {
    const { start } = this.tokens.consume("return").loc;
    let expression: Expression | undefined;
    if (isExpressionLookahead(this.tokens.peek())) {
      expression = this.expression();
    }
    const { end } = this.tokens.consume(";").loc;

    return {
      id: uuid(),
      type: "ReturnStatement",
      expression,
      loc: { start, end },
    };
  }

  private arrayLiteral(): ArrayLiteral {
    const { start } = this.tokens.consume("[").loc;
    const elements = isExpressionLookahead(this.tokens.peek())
      ? this.exprList()
      : [];
    const { end } = this.tokens.consume("]").loc;

    return {
      id: uuid(),
      type: "ArrayLiteral",
      elements,
      loc: { start, end },
    };
  }

  private exprList(): Expression[] {
    const first = this.expression();
    const expressions: Expression[] = [first];
    while (this.tokens.peek().type === ",") {
      this.tokens.consume(",");
      if (isExpressionLookahead(this.tokens.peek())) {
        expressions.push(this.expression());
      }
    }
    return expressions;
  }

  private objectLiteral(): ObjectLiteral {
    const { start } = this.tokens.consume("{").loc;
    const pairs = isKVPairLookahead(this.tokens.peek()) ? this.kvpairs() : [];
    const { end } = this.tokens.consume("}").loc;

    return {
      id: uuid(),
      type: "ObjectLiteral",
      pairs,
      loc: { start, end },
    };
  }

  private kvpairs(): KVPair[] {
    const first = this.kvpair();
    const pairs: KVPair[] = [first];
    while (this.tokens.peek().type === ",") {
      this.tokens.consume(",");
      if (isKVPairLookahead(this.tokens.peek())) {
        pairs.push(this.kvpair());
      }
    }
    return pairs;
  }

  private kvpair(): KVPair {
    let key: ExpressionKey | IdentifierKey;
    if (this.tokens.peek().type === "[") {
      this.tokens.consume("[");
      const expression = this.expression();
      key = {
        type: "ExpressionKey",
        expression,
      };
      this.tokens.consume("]");
    } else {
      const prim = this.primitive();
      if (prim.type === "Identifier") {
        key = {
          type: "IdentifierKey",
          identifier: prim,
        };
      } else {
        key = {
          type: "ExpressionKey",
          expression: prim,
        };
      }
    }
    this.tokens.consume(":");
    const value = this.expression();
    return [key, value];
  }

  private parenthesizedExpression(): ParenthesizedExpression {
    const { start } = this.tokens.consume("(").loc;
    const expression = this.expression();
    const { end } = this.tokens.consume(")").loc;

    return {
      id: uuid(),
      type: "ParenthesizedExpression",
      expression,
      loc: { start, end },
    };
  }

  private functionDeclaration(): FunctionDeclaration {
    const { start } = this.tokens.consume("fn").loc;
    const name = (this.tokens.consume("identifier") as IdentifierToken).val;
    this.tokens.consume("(");
    let params: Identifier[] =
      this.tokens.peek().type === "identifier" ? this.params() : [];
    this.tokens.consume(")");
    this.tokens.consume("{");
    const body = this.block();
    const { end } = this.tokens.consume("}").loc;

    return {
      id: uuid(),
      type: "FunctionDeclaration",
      name,
      params: params,
      body,
      loc: { start, end },
    };
  }

  private params(): Identifier[] {
    const firstParam = this.tokens.consume("identifier") as IdentifierToken;
    const params: Identifier[] = [
      {
        id: uuid(),
        type: "Identifier",
        name: firstParam.val,
        loc: firstParam.loc,
      },
    ];
    while (this.tokens.peek().type === ",") {
      this.tokens.consume(",");
      if (this.tokens.peek().type === "identifier") {
        const next = this.tokens.consume("identifier") as IdentifierToken;
        params.push({
          id: uuid(),
          type: "Identifier",
          name: next.val,
          loc: next.loc,
        });
      }
    }
    return params;
  }

  private expression(): Expression {
    return this.orExpression();
  }

  private orExpression(): Expression {
    let left: Expression = this.andExpression();
    while (this.tokens.peek().type === "||") {
      this.tokens.consume("||");
      const right = this.andExpression();
      left = {
        id: uuid(),
        type: "BinaryExpression",
        left,
        operator: "||",
        right,
        loc: { start: left.loc.start, end: right.loc.end },
      };
    }
    return left;
  }

  private andExpression(): Expression {
    let left: Expression = this.equalityExpression();
    while (this.tokens.peek().type === "&&") {
      this.tokens.consume("&&");
      const right = this.equalityExpression();
      left = {
        id: uuid(),
        type: "BinaryExpression",
        left,
        operator: "&&",
        right,
        loc: { start: left.loc.start, end: right.loc.end },
      };
    }
    return left;
  }

  private equalityExpression(): Expression {
    let left: Expression = this.relationalExpression();
    while (
      this.tokens.peek().type === "==" ||
      this.tokens.peek().type === "!="
    ) {
      const operator = this.tokens.consume(["==", "!="]).type as "==" | "!=";
      const right = this.relationalExpression();
      left = {
        id: uuid(),
        type: "BinaryExpression",
        left,
        operator,
        right,
        loc: { start: left.loc.start, end: right.loc.end },
      };
    }
    return left;
  }

  private relationalExpression(): Expression {
    let left: Expression = this.additiveExpression();
    while (
      this.tokens.peek().type === "<" ||
      this.tokens.peek().type === ">" ||
      this.tokens.peek().type === "<=" ||
      this.tokens.peek().type === ">="
    ) {
      const operator = this.tokens.consume(["<", ">", "<=", ">="]).type as
        | "<"
        | ">"
        | "<="
        | ">=";
      const right = this.additiveExpression();
      left = {
        id: uuid(),
        type: "BinaryExpression",
        left,
        operator,
        right,
        loc: { start: left.loc.start, end: right.loc.end },
      };
    }
    return left;
  }

  private additiveExpression(): Expression {
    let left: Expression = this.multiplicativeExpression();
    while (this.tokens.peek().type === "+" || this.tokens.peek().type === "-") {
      const operator = this.tokens.consume(["+", "-"]).type as "+" | "-";
      const right = this.multiplicativeExpression();
      left = {
        id: uuid(),
        type: "BinaryExpression",
        left,
        operator,
        right,
        loc: { start: left.loc.start, end: right.loc.end },
      };
    }
    return left;
  }

  private multiplicativeExpression(): Expression {
    let left: Expression = this.atom();
    while (
      this.tokens.peek().type === "*" ||
      this.tokens.peek().type === "/" ||
      this.tokens.peek().type === "%"
    ) {
      const operator = this.tokens.consume(["*", "/", "%"]).type as
        | "*"
        | "/"
        | "%";
      const right = this.atom();
      left = {
        id: uuid(),
        type: "BinaryExpression",
        left,
        operator,
        right,
        loc: { start: left.loc.start, end: right.loc.end },
      };
    }
    return left;
  }

  private primitive(): Primitive {
    const token = this.tokens.peek();
    if (token.type === "true") {
      this.tokens.consume("true");
      return {
        id: uuid(),
        type: "BooleanLiteral",
        value: true,
        loc: token.loc,
      };
    } else if (token.type === "false") {
      this.tokens.consume("false");
      return {
        id: uuid(),
        type: "BooleanLiteral",
        value: false,
        loc: token.loc,
      };
    } else if (token.type === "number") {
      this.tokens.consume("number");
      return {
        id: uuid(),
        type: "NumberLiteral",
        value: Number(token.val),
        loc: token.loc,
      };
    } else if (token.type === "string") {
      this.tokens.consume("string");
      return {
        id: uuid(),
        type: "StringLiteral",
        value: token.val,
        loc: token.loc,
      };
    } else if (token.type === "null") {
      this.tokens.consume("null");
      return {
        id: uuid(),
        type: "NullLiteral",
        loc: token.loc,
      };
    } else if (token.type === "identifier") {
      this.tokens.consume("identifier");
      return {
        id: uuid(),
        type: "Identifier",
        name: token.val,
        loc: token.loc,
      };
    }
    throw new Error(
      `Unexpected token: ${token.type} at line ${token.loc.start.line}, col ${token.loc.start.col}`,
    );
  }
  private atom(): Atom {
    const token = this.tokens.peek();
    if (isPrimitiveLookahead(token)) {
      return this.primitive();
    } else if (token.type === "(") {
      return this.parenthesizedExpression();
    } else if (token.type === "[") {
      return this.arrayLiteral();
    } else if (token.type === "{") {
      return this.objectLiteral();
    } else {
      throw new Error(
        `Unexpected token: ${token.type} at line ${token.loc.start.line}, col ${token.loc.start.col}`,
      );
    }
  }

  parse(): Block {
    const program = this.block();
    this.tokens.consume("EOF");
    return program;
  }
}
