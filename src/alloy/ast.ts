import { Branded } from '../type-brand';

export type AVar = Branded<string, 'AVar'>;

export interface AlloyModel {
  sigs: {[name: string]: ASig };
  preds: {[name: string]: APred };
}

export interface AField {
  name: string;
  type: string;
  var?: boolean;
}

export type ASig = AObjectSig | AEnumSig;

export interface AObjectSig {
  type: 'object';
  name: string;
  fields: {[name: string]: AField};
}

export interface AEnumSig {
  type: 'enum';
  name: string;
  variants: string[];
}

export interface APred {
  type: 'pred';
  name: string;
  /** [name, type] */
  parameters?: Array<[string, string]>;
  clauses: AExpr[];
}

export interface AUnivQual {
  type: 'qual';
  qual: 'all' | 'one' | 'some';
  var: string;
  set: string;
  pred: AExpr;
}

export type AExpr = ABinop | APropertyAccess | AIdentifier | APredCall | AOr | AAnd | AIntLit | APrime | AUnivQual | ATimeQual;

export interface ABinop {
  type: '=' | 'in' | '=>' | '++' | '->';
  lhs: AExpr;
  rhs: AExpr;
}

export interface APropertyAccess {
  type: 'access';
  lhs: AExpr;
  prop: string;
}

export interface AIdentifier {
  type: 'ident';
  id: string;
}

export interface APredCall {
  type: 'call';
  pred: string;
  args: AExpr[];
}

export interface AOr {
  type: 'or';
  clauses: AExpr[];
}

export interface AAnd {
  type: 'and';
  clauses: AExpr[];
}

export interface AIntLit {
  type: 'intlit';
  value: number;
}

export interface APrime {
  type: 'prime';
  inner: AExpr;
}

export interface ATimeQual {
  type: 'time';
  qual: 'always' | 'eventually';
  pred: AExpr;
}