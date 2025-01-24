import { FBinop, FExpr } from "./ast";

export function fBinop<A extends FBinop['type']>(type: A, lhs: FExpr, rhs: FExpr): Extract<FBinop, { type: A }> {
  return { type, lhs, rhs } as any;
}