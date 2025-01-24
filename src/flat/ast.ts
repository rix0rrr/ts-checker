export type FStatement = FAssignment | FGoto;

export interface FAssignment {
  type: 'assign';
  lhs: FExpr;
  rhs: FExpr;
}

export interface FGoto {
  type: 'goto';
  label: string;
}

export type FExpr = FBinop | FIdentifier | FIntLit;

export interface FIdentifier {
  type: 'ident';
  id: string;
}

export interface FBinop {
  type: 'eq' | 'plus';
  lhs: FExpr;
  rhs: FExpr;
}

export interface FIntLit {
  type: 'intlit';
  value: number;
}