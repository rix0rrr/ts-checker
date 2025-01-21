import { FunctionTranslation } from '../translate-function';
import { nonNull } from '../util';
import { AClause, AlloyModel, APred } from './ast';
import { aAnd, aBinop, aIdent, aModel, aPredCall } from './ast-builder';

export function combineInitsAndSteps(functions: FunctionTranslation[]): AlloyModel {
  return aModel([], [
    {
      type: 'pred',
      name: 'init',
      clauses: combineInitPreds(functions),
    },
    {
      type: 'pred',
      name: 'step',
      clauses: combineStepPreds(functions),
    },
    {
      type: 'pred',
      name: 'allEnd',
      clauses: combineEndPreds(functions),
    },
  ]);
}

function combineInitPreds(functions: FunctionTranslation[]): AClause[] {
  return functions.map(fn => ({
    type: 'qual',
    qual: 'all',
    var: 'x',
    set: fn.stateSig.name,
    pred: aPredCall(fn.initPred.name, [aIdent('x')]),
  }));
}

function combineStepPreds(functions: FunctionTranslation[]): AClause[] {
  const allPredTypes = Array.from(new Set(functions.map(fn => fn.stateSig.name)));

  return [{
    type: 'qual',
    qual: 'one',
    var: 'x',
    set: allPredTypes.join(' & '),
    pred: aAnd(functions.map(fn =>
      aBinop('=>',
        aBinop('in', aIdent('x'), aIdent(fn.stateSig.name)),
        aPredCall(fn.stepPred.name, [aIdent('x')]),
      ),
    )),
  }];
}

function combineEndPreds(functions: FunctionTranslation[]): AClause[] {
  const allPredTypes = Array.from(new Set(functions.map(fn => fn.stateSig.name)));

  return [{
    type: 'qual',
    qual: 'all',
    var: 'x',
    set: allPredTypes.join(' & '),
    pred: aAnd(functions.map(fn =>
      aBinop('=>',
        aBinop('in', aIdent('x'), aIdent(fn.stateSig.name)),
        aPredCall(fn.atEndPred.name, [aIdent('x')]),
      ),
    )),
  }];
}