export type FStatement = FAssignment | FGoto | FAssertion;

export interface FAssignment {
  type: 'assign';
  lhs: FExpr;
  rhs: FExpr;
  comment?: string;
}

export interface FAssertion {
  type: 'assert';
  assertion: FExpr;
  comment?: string;
}

export interface FGoto {
  type: 'goto';
  label: string;
  comment?: string;
}

export type FExpr = FBinop | FIdentifier | FIntLit;

export interface FIdentifier {
  type: 'ident';
  id: string;
}

export interface FBinop {
  type: 'assign' | 'plus' | 'eq';
  lhs: FExpr;
  rhs: FExpr;
}

export interface FIntLit {
  type: 'intlit';
  value: number;
}