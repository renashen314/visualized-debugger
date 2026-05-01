interface Block {
  statement: Statement[];
}

type Statement = IfStatement | WhileLoop;

interface IfStatement {
  type: "IfStatement";
  condition: Expression;
  body: Block;
}

interface WhileLoop {
  type: "WhileLoop";
  condition: Expression;
  body: Block;
}

interface BooleanLiteral {
  type: "BooleanLiteral";
  value: boolean;
}

type Expression = BooleanLiteral;
