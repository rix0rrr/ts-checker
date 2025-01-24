import { AlloyModel, AExpr, APred, ASig, AObjectSig } from './alloy/ast';
import { aBinop, aAccess, aIdent, aModel, aAddVars } from './alloy/ast-builder';
import { requireInt, ucfirst } from './util';
import { statementsToFlat } from './typescript-to-flat';
import { Node, FunctionDeclaration, SyntaxKind } from 'ts-morph';
import { flatToAlloy } from './flat-to-alloy';
import { fLabels } from './flat/flatprogram';
import { findVariables, makeScope, makeVariableSig, Scope } from './variables';

export interface FunctionTranslation {
  model: AlloyModel;
  stateSig: ASig,
  initPred: APred,
  stepPred: APred,
  atEndPred: APred,
}

// FIXME: Global vars
export function translateFunction(fn: FunctionDeclaration, parentScope: Scope): FunctionTranslation {
  const name = ucfirst(fn.getName() ?? 'xxx');

  const stateVarName = 'st';

  const pcSig: ASig = {
    type: 'enum',
    name: `${name}PC`,
    variants: []
  };

  const stateSigName = `${name}Op`;

  const stateVar = aIdent(stateVarName);
  const pcVarName = 'pc';

  const variables = findVariables(fn);

  // Just do statements for now
  const stateSig = makeVariableSig(stateSigName, variables);
  stateSig.fields.pc = { name: 'pc', type: pcSig.name, var: true };

  aAddVars(stateSig, variables);
  const scope = makeScope(variables, stateVar, stateSigName, parentScope);

  const initPred = makeInitPred(`${fn.getName()}_init`, scope);

  const flat = statementsToFlat(fn.getStatements());
  const stepDisjunction = flatToAlloy(aIdent(pcVarName), flat, scope);
  initPred.clauses.push(aBinop('=', aAccess(stateVar, pcVarName), aIdent(flat.start)));

  const stepPred: APred = {
    type: 'pred',
    name: `${fn.getName()}_step`,
    parameters: [[stateVarName, stateSig.name]],
    clauses: [stepDisjunction],
  };

  pcSig.variants.push(...fLabels(flat), 'end');

  const atEndPred: APred = {
    type: 'pred',
    name: `${fn.getName()}_atEnd`,
    parameters: [[stateVarName, stateSig.name]],
    clauses: [aBinop('=', aAccess(stateVar, pcVarName), aIdent('end'))],
  };

  return {
    model: aModel([stateSig, pcSig], [initPred, stepPred, atEndPred]),
    initPred,
    stepPred,
    stateSig,
    atEndPred,
  };
}

export function makeInitPred(name: string, scope: Scope): APred {
  const stateVarName = 'st';

  return {
    type: 'pred',
    name,
    parameters: [ [stateVarName, scope.stateType] ],
    clauses: Object.values(scope.variables).map(v => aBinop('=', aAccess(aIdent(stateVarName), v.name), v.initialValue)),
  };
}