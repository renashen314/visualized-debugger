import { type Token, TokenManager } from "./tokenizer.ts";
import type {
  Atom,
  Block,
  ElseIf,
  Expression,
  IfStatement,
  Statement,
  WhileLoop,
} from "./ast";
import { uuid } from "../utils.ts";

function isWhileLoopLookahead(token: Token): boolean {
  return token.type === "while";
}

function isIfStatementLookahead(token: Token): boolean {
  return token.type === "if";
}

function isStatementLookahead(token: Token): boolean {
  return isWhileLoopLookahead(token) || isIfStatementLookahead(token);
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
    } else {
      throw new Error(
        `Expected statement, but got ${token.type} at line ${token.loc.start.line}, col ${token.loc.start.col}`,
      );
    }
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
    this.tokens.consume("}");
    const { end } = this.tokens.peek().loc;

    return {
      id: uuid(),
      type: "WhileLoop",
      condition,
      body,
      loc: { start, end },
    };
  }

  private expression(): Expression {
    return this.atom();
  }

  private atom(): Atom {
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
