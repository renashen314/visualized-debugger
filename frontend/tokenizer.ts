interface Position {
  line: number;
  col: number;
  i: number;
}

export interface TokenLocation {
  start: Position;
  end: Position;
}

interface BaseToken {
  loc: TokenLocation;
}

type KeywordType =
  | "if"
  | "else"
  | "while"
  | "true"
  | "false"
  | "null"
  | "function"
  | "fn"
  | "return";

interface KeywordToken extends BaseToken {
  type: KeywordType;
}

interface IdentifierToken extends BaseToken {
  type: "identifier";
  val: string;
}
interface StringToken extends BaseToken {
  type: "string";
  val: string;
}

interface NumberTokens extends BaseToken {
  type: "number";
  val: number;
}

type SymbolType =
  | "("
  | ")"
  | "{"
  | "}"
  | "["
  | "]"
  | ","
  | "."
  | ":"
  | ";"
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "_"
  | "&&"
  | "||"
  | "!"
  | "<"
  | ">"
  | "="
  | "<="
  | "=>"
  | "=="
  | "!=";

interface SymbolToken extends BaseToken {
  type: SymbolType;
}

interface EOFToken extends BaseToken {
  type: "EOF";
}

type TokenType =
  | KeywordType
  | "identifier"
  | "string"
  | "number"
  | SymbolType
  | "EOF";

export type Token =
  | KeywordToken
  | IdentifierToken
  | StringToken
  | NumberTokens
  | SymbolToken
  | EOFToken;

class Incrementer {
  private readonly position: Position = { line: 1, col: 1, i: 0 };

  inc() {
    this.position.i++;
    this.position.col++;
  }

  newline() {
    this.position.line++;
    this.position.col = 1;
  }

  pos(): Position {
    return { ...this.position };
  }

  i(): number {
    return this.position.i;
  }
}

class Tokenizer {
  private readonly program: string;
  private readonly inc: Incrementer = new Incrementer();

  constructor(program: string) {
    this.program = program;
  }

  tokenize() {
    const tokens: Token[] = [];

    while (this.inc.i() < this.program.length) {
      const c = this.program[this.inc.i()];

      if (isAlpha(c)) {
        tokens.push(this.identifierOrKeyword());
        continue;
      }

      if (isDigit(c)) {
        tokens.push(this.num());
        continue;
      }

      if (c === '"') {
        tokens.push(this.str());
        continue;
      }

      const d = this.program[this.inc.i() + 1];

      if (isTwoCharSymbol(`${c}${d}`)) {
        tokens.push(this.twoCharSymbol());
        continue;
      }

      if (isOneCharSymbol(c)) {
        tokens.push(this.oneCharSymbol());
        continue;
      }

      if (c === " ") {
        this.inc.inc();
        continue;
      }

      if (c === "\n") {
        this.inc.inc();
        this.inc.newline();
        continue;
      }

      throw new Error(
        `Unexpected character '${c}' at line ${this.inc.pos().line}, col ${this.inc.pos().col}`,
      );
    }

    tokens.push({
      type: "EOF",
      loc: { start: this.inc.pos(), end: this.inc.pos() },
    });
    return tokens;
  }

  identifierOrKeyword(): IdentifierToken | KeywordToken {
    const start = this.inc.pos();
    let val = "";
    while (isAlphaNumeric(this.program[this.inc.i()])) {
      val += this.program[this.inc.i()];
      this.inc.inc();
    }
    const end = this.inc.pos();
    if (isKeyword(val)) {
      return {
        type: val,
        loc: {
          start,
          end,
        },
      };
    }

    return {
      type: "identifier",
      val,
      loc: {
        start,
        end,
      },
    };
  }

  num(): NumberTokens {
    const start = this.inc.pos();

    let val = "";

    while (isDigit(this.program[this.inc.i()])) {
      val += this.program[this.inc.i()];
      this.inc.inc();
    }

    if (this.program[this.inc.i()] === ".") {
      val += ".";
      this.inc.inc();

      while (isDigit(this.program[this.inc.i()])) {
        val += this.program[this.inc.i()];
        this.inc.inc();
      }
    }

    const end = this.inc.pos();

    return {
      type: "number",
      val: Number(val),
      loc: {
        start,
        end,
      },
    };
  }

  str(): StringToken {
    const start = this.inc.pos();
    this.inc.inc();
    let val = "";
    while (
      this.inc.i() < this.program.length &&
      this.program[this.inc.i()] !== '"'
    ) {
      val += this.program[this.inc.i()];
      this.inc.inc();
    }
    this.inc.inc();
    const end = this.inc.pos();
    return {
      type: "string",
      val,
      loc: {
        start,
        end,
      },
    };
  }

  twoCharSymbol(): SymbolToken {
    const start = this.inc.pos();
    const c = this.program[this.inc.i()];
    const d = this.program[this.inc.i() + 1];
    this.inc.inc();
    this.inc.inc();
    const end = this.inc.pos();
    return {
      type: `${c}${d}` as SymbolType,
      loc: { start, end },
    };
  }
  oneCharSymbol(): SymbolToken {
    const start = this.inc.pos();
    const c = this.program[this.inc.i()];
    this.inc.inc();
    const end = this.inc.pos();
    return {
      type: c as SymbolType,
      loc: { start, end },
    };
  }
}

const keywords = new Set([
  "if",
  "else",
  "while",
  "true",
  "false",
  "null",
  "function",
  "fn",
  "return",
]);

function isKeyword(s: string): s is KeywordType {
  return keywords.has(s);
}

const alpha = /[a-zA-Z_]/;
const digit = /[0-9]/;

function isAlpha(c: string): c is string {
  return alpha.test(c);
}

function isDigit(c: string): c is string {
  return digit.test(c);
}

function isAlphaNumeric(c: string): boolean {
  return isAlpha(c) || isDigit(c);
}

const oneCharSymbols = new Set([
  "(",
  ")",
  "{",
  "}",
  "[",
  "]",
  ",",
  ";",
  ":",
  ".",
  "+",
  "-",
  "*",
  "/",
  "%",
  "!",
  "<",
  ">",
  "=",
  "_",
]);

function isOneCharSymbol(s: string): s is SymbolType {
  return oneCharSymbols.has(s);
}

const twoCharSymbols = new Set(["&&", "||", "<=", "=>", "==", "!="]);

function isTwoCharSymbol(s: string): s is SymbolType {
  return twoCharSymbols.has(s);
}

class TokenManager {
  private readonly tokens: Token[];
  private i: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(): Token {
    return this.tokens[this.i];
  }

  consume(types?: TokenType | TokenType[]) {
    if (typeof types === "string") {
      types = [types];
    }

    if (!(types || []).includes(this.tokens[this.i].type)) {
      throw new Error(
        `Expected token type ${(types || []).join(",")}, but got ${this.tokens[this.i].type} at line ${this.tokens[this.i].loc.start.line}, col ${this.tokens[this.i].loc.start.col}`,
      );
    }

    const token = this.tokens[this.i];
    this.i++;
    return token;
  }
}

export { Tokenizer, TokenManager, type IdentifierToken };
