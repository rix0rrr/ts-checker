import { FlatProgram, FlatProgramBuilder } from './flat/flatprogram';
import { FBinop, FExpr } from './flat/ast';
import { Expression, Node, Statement, SyntaxKind } from 'ts-morph';
import { requireInt } from './util';
import { AExpr } from './alloy/ast';

export function statementsToFlat(xs: Statement[]): FlatProgram {
  const ret = new FlatProgramBuilder();

  for (const x of xs) {
    translateStatement(x, ret);
  }

  return ret.program;
}

function translateStatement(x: Statement, p: FlatProgramBuilder) {
  if (Node.isVariableStatement(x)) {
    // We already did variables
    return;
  }

  if (Node.isExpressionStatement(x) && Node.isAwaitExpression(x.getExpression())) {
    // Await
    p.newChunk();
    return;
  }

  if (Node.isExpressionStatement(x) && x.getExpression().asKind(SyntaxKind.BinaryExpression)?.getOperatorToken()?.getText() === '=') {
    // Assignment
    const binOp = x.getExpression().asKindOrThrow(SyntaxKind.BinaryExpression);

    p.append({
      type: 'assign',
      lhs: translateExpressionToFlat(binOp.getLeft()),
      rhs: translateExpressionToFlat(binOp.getRight()),
    });
    return;
  }

  throw new Error(`Can't handle this statement yet: ${x.print()}`);
}

function translateExpressionToFlat(x: Expression): FExpr {
  const ident = x.asKind(SyntaxKind.Identifier);
  if (ident) {
    return {
      type: 'ident',
      id: ident.getText(),
    };
  }

  const litNum = x.asKind(SyntaxKind.NumericLiteral);
  if (litNum) {
    return {
      type: 'intlit',
      value: requireInt(litNum.getLiteralValue()),
    };
  }

  const binExpr = x.asKind(SyntaxKind.BinaryExpression);
  if (binExpr) {
    const typeMap: Array<[SyntaxKind, FBinop['type']]> = [
      [SyntaxKind.PlusToken, 'plus'],
      [SyntaxKind.EqualsToken, 'eq'],
    ];

    for (const [syntax, type] of typeMap) {
      if (binExpr.getOperatorToken().isKind(syntax)) {
        return {
          type,
          lhs: translateExpressionToFlat(binExpr.getLeft()),
          rhs: translateExpressionToFlat(binExpr.getRight()),
        };
      }
    }
  }

  throw new Error(`Don't know how to translate expression: ${x.print()} (${x.getKindName()})`);
}

