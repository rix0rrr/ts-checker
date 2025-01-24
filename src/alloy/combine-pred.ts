import { FunctionTranslation } from '../translate-function';
import { AExpr, AlloyModel } from './ast';
import { aAnd, aBinop, aIdent, aModel, aOr, aPredCall, aTime } from './ast-builder';

export function combineFunctions(functions: FunctionTranslation[]): AlloyModel {
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
    {
      type: 'pred',
      name: 'completeRun',
      clauses: [
        aPredCall('init'),
        aTime('always', aPredCall('step')),
        aTime('eventually', aPredCall('allEnd')),
      ],
    },
  ]);
}

function combineInitPreds(functions: FunctionTranslation[]): AExpr[] {
  return functions.map(fn => ({
    type: 'qual',
    qual: 'all',
    var: 'x',
    set: fn.stateSig.name,
    pred: aPredCall(fn.initPred.name, [aIdent('x')]),
  }));
}

function combineStepPreds(functions: FunctionTranslation[]): AExpr[] {
  return [
    aOr(functions.map(fn => ({
      type: 'qual',
      qual: 'some',
      var: 'x',
      set: fn.stateSig.name,
      pred: aPredCall(fn.stepPred.name, [aIdent('x')]),
    })))
  ];
}

function combineEndPreds(functions: FunctionTranslation[]): AExpr[] {
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