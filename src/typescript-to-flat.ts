import { FlatProgram, FlatProgramBuilder } from './flat/flatprogram';
import { FBinop, FExpr } from './flat/ast';
import { Expression, Node, Statement, SyntaxKind } from 'ts-morph';
import { requireInt } from './util';

export function typescriptToFlat(xs: Statement[]): FlatProgram {
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

  if (Node.isExpressionStatement(x)) {
    const expr = x.getExpression();
    if (Node.isAwaitExpression(expr)) {
      // Await
      p.newChunk();
      return;
    }

    const callExpr = expr.asKind(SyntaxKind.CallExpression);
    if (callExpr) {
      const ident = callExpr.getExpression().asKind(SyntaxKind.Identifier);
      if (!ident) {
        throw new Error(`Only plain functions can be called: ${callExpr.print()}`);
      }

      if (ident.getText() === 'assert') {
        if (callExpr.getArguments().length !== 1) {
          throw new Error(`assert takes 1 argument: ${callExpr.print()}`);
        }

        const arg = callExpr.getArguments()[0];
        if (!Node.isExpression(arg)) {
          // This can't really fail but we have to type check it
          throw new Error(`Argument must be expression`);
        }

        p.append({
          type: 'assert',
          assertion: translateExpressionToFlat(arg),
          comment: x.print(),
        });
        return;
      }

      throw new Error(`Unrecognized function called: ${ident.print()}`);
    }

    if (expr.asKind(SyntaxKind.BinaryExpression)?.getOperatorToken()?.getText() === '=') {
      // Assignment
      const binOp = expr.asKindOrThrow(SyntaxKind.BinaryExpression);

      p.append({
        type: 'assign',
        lhs: translateExpressionToFlat(binOp.getLeft()),
        rhs: translateExpressionToFlat(binOp.getRight()),
        comment: x.print(),
      });
      return;
    }
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
      [SyntaxKind.EqualsToken, 'assign'],
      [SyntaxKind.EqualsEqualsToken, 'eq'],
      [SyntaxKind.EqualsEqualsEqualsToken, 'eq'],
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

