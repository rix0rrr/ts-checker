import { AExpr, AIdentifier } from './alloy/ast';
import { aAccess, aAnd, aBinop, aIdent, aIntLit, aOr, aPredCall, aPrime, aUpdateT, visit } from './alloy/ast-builder';
import { FExpr, FStatement } from './flat/ast';
import { FlatProgram } from './flat/flatprogram';
import deepEqual from 'deep-equal';

export function flatToAlloy(pcVar: AIdentifier, p: FlatProgram, selfVar: AIdentifier, vars: AIdentifier[]) {
  const transitions: AExpr[] = [];
  const chunks = Object.entries(p.chunks);

  for (let i = 0; i < chunks.length; i++) {
    const [label, chunk] = chunks[i];
    const sequentialLabel = chunks[i + 1]?.[0] ?? 'end';

    const translation = translateFlat(chunk, selfVar);

    const nextLabel = translation.nextLabel ?? sequentialLabel;

    transitions.push(aAnd([
      // Precondition
      aBinop('=', aAccess(selfVar, pcVar.id), aIdent(label)),

      // Effects
      ...translation.exprs ?? [],
      aUpdateT(pcVar, selfVar, aIdent(nextLabel)),
      // Unchanged variables
      ...frame(vars, translation.exprs ?? []),
    ]));
  }

  // Or we can just stutter (not do anything at all)
  transitions.push(aAnd([
      aBinop('=', aPrime(pcVar), pcVar),
      ...frame(vars, []),
  ]));

  return aOr(transitions);
}

/**
 * Return frame conditions for all variables that are unused in 'exprs'
 */
export function frame(vars: AIdentifier[], exprs: AExpr[]) {
  const unused = [...vars];

  for (const expr of exprs) {
    visit(expr, (e) => {
      let i = unused.findIndex((candidate) => deepEqual(e, candidate));
      if (i > -1) {
        unused.splice(i, 1);
      }

      return e;
    });
  }

  return unused.map(v => aBinop('=', aPrime(v), v));
}

function translateFlat(st: FStatement[], selfVar: AIdentifier): Translation {
  if (st.length !== 1) {
    throw new Error('Currently do not support clauses with multiple statements');
  }

  const fst = st[0];

  switch (fst.type) {
    case 'assign': {
      return {
        exprs: [
          aUpdateT(translateExpr(fst.lhs), selfVar, accessIdentifiersOn(translateExpr(fst.rhs), selfVar)),
        ],
      };
    }

    case 'goto':
      return {
        nextLabel: fst.label,
      };
  }
}

function translateExpr(e: FExpr): AExpr {
  switch (e.type) {
    case 'eq':
      return aBinop('=', translateExpr(e.lhs), translateExpr(e.rhs));
    case 'ident':
      return aIdent(e.id);
    case 'intlit':
      return aIntLit(e.value);
    case 'plus':
      return aPredCall('plus', [translateExpr(e.lhs), translateExpr(e.rhs)]);
  }
}

interface Translation {
  exprs?: AExpr[];
  nextLabel?: string;
}

/**
 * Turn all identifiers into accesses on an object
 */
function accessIdentifiersOn(expr: AExpr, stateVar: AExpr) {
  return visit(expr, (e) => {
    if (e.type === 'ident') {
      return aAccess(stateVar, e.id);
    }
    return e;
  });
}