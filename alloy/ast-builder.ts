import { AlloyModel, AExpr, AIdentifier, APred, APropertyAccess, ASig, AOr, AClause, AAnd, AVar, AIntLit, APredCall, APrime } from "./ast";

export function aModel(sigs: ASig[], preds: APred[]): AlloyModel {
  return {
    sigs: Object.fromEntries(sigs.map(x => [x.name, x])),
    preds: Object.fromEntries(preds.map(x => [x.name, x])),
  };
}

export function aMergeModel(into: AlloyModel, source: AlloyModel) {
  Object.assign(into.sigs, source.sigs);
  Object.assign(into.preds, source.preds);
}

export function aIdent(id: string): AIdentifier {
  return { type: 'ident', id };
}

export function aPrime(inner: AExpr): APrime {
  return { type: 'prime', inner };
}

export function aIntLit(value: number): AIntLit {
  return { type: 'intlit', value };
}

export function aPredCall(pred: string, args: AExpr[]): APredCall {
  return { type: 'call', pred, args };
}

export function aAccess(lhs: AExpr, prop: string): APropertyAccess {
  return { type: 'access', lhs, prop };
}

type BinOps = Extract<AExpr, { lhs: AExpr, rhs: AExpr }>;

export function aBinop<A extends BinOps['type']>(type: A, lhs: AExpr, rhs: AExpr): Extract<BinOps, { type: A }> {
  return { type, lhs, rhs } as any;
}

export function aOr(clauses: AExpr[]): AOr {
  if (clauses.length === 0) {
    throw new Error('Cannot have an empty or');
  }
  return { type: 'or', clauses };
}

export function aAnd(clauses: AExpr[]): AAnd {
  if (clauses.length === 0) {
    throw new Error('Cannot have an empty and');
  }
  return { type: 'and', clauses };
}

export function visit(e: AExpr, trans: (e: AExpr) => AExpr): AExpr {
  const recurse = (x: AExpr) => visit(x, trans);

  switch (e.type) {
    case 'ident':
    case 'intlit':
      return trans(e);
    case 'access':
      return trans({ type: 'access', lhs: recurse(e.lhs), prop: e.prop });
    case 'call':
      return trans({ type: 'call', pred: e.pred, args: e.args.map(recurse) });
    case 'and':
    case 'or':
      return trans({ type: e.type, clauses: e.clauses.map(recurse) });
    case '=':
    case 'in':
    case '=>':
      return trans({ type: e.type, lhs: recurse(e.lhs), rhs: recurse(e.rhs) });
    case 'prime':
      return trans({ type: 'prime', inner: recurse(e.inner) });
  }
}

/**
 * Prime all variable references inside the given expression
 */
export function deepPrime(e: AExpr): AExpr {
  return visit(e, (e) => {
    switch (e.type) {
      case 'ident':
        return aPrime(aIdent(e.id));
      default:
        return e;
    }
  });
}