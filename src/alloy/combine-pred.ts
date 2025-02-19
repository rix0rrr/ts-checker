import { isDefined } from '../util';
import { AExpr, AlloyModel, APred } from './ast';
import { aAnd, aBinop, aIdent, aImplies, aModel, aOr, aPredCall, aTime } from './ast-builder';

export interface StateMachine {
  initPred: APred,
  stepPred?: APred,
  atEndPred?: APred,
  assertPred?: APred;
}

export function combineFunctions(functions: StateMachine[]): AlloyModel {
  const inits = functions.map(f => f.initPred).filter(isDefined);
  const steps = functions.map(f => f.stepPred).filter(isDefined);
  const atEnds = functions.map(f => f.atEndPred).filter(isDefined);
  const assertions = functions.map(f => f.assertPred).filter(isDefined);

  return aModel([], [
    {
      type: 'pred',
      name: 'init',
      clauses: combinePreds(inits),
    },
    {
      type: 'pred',
      name: 'step',
      clauses: combineStepPreds(steps),
    },
    {
      type: 'pred',
      name: 'allEnd',
      clauses: combineEndPreds(atEnds),
    },
    {
      type: 'pred',
      name: 'satisfyAssertions',
      clauses: combinePreds(assertions),
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
    {
      type: 'assert',
      name: 'runSatisfiesAssertions',
      clauses: [
        aImplies(aAnd([
          aPredCall('init'),
          aTime('always', aPredCall('step')),
        ]), aTime('always', aPredCall('satisfyAssertions'))),
      ],
    },
  ]);
}

function combinePreds(preds: APred[]): AExpr[] {
  return preds.map(fn => ({
    type: 'qual',
    qual: 'all',
    var: 'x',
    set: predArgType(fn),
    pred: aPredCall(fn.name, [aIdent('x')]),
  }));
}

function combineStepPreds(preds: APred[]): AExpr[] {
  return [
    aOr(preds.map(fn => ({
      type: 'qual',
      qual: 'some',
      var: 'x',
      set: predArgType(fn),
      pred: aPredCall(fn.name, [aIdent('x')]),
    })))
  ];
}

function combineEndPreds(preds: APred[]): AExpr[] {
  const allPredTypes = Array.from(new Set(preds.map(fn => predArgType(fn))));

  return [{
    type: 'qual',
    qual: 'all',
    var: 'x',
    set: allPredTypes.join(' & '),
    pred: aAnd(preds.map(fn =>
      aBinop('=>',
        aBinop('in', aIdent('x'), aIdent(predArgType(fn))),
        aPredCall(fn.name, [aIdent('x')]),
      ),
    )),
  }];
}

function predArgType(pred: APred) {
  const p = pred.parameters?.[0][1];
  if (!p) {
    throw new Error(`Missing argument on predicate ${pred.name}`);
  }
  return p;
}