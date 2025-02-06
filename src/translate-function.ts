import { AlloyModel, APred, ASig } from './alloy/ast';
import { aBinop, aAccess, aIdent, aModel, aAddVars, aOr } from './alloy/ast-builder';
import { ucfirst } from './util';
import { typescriptToFlat } from './typescript-to-flat';
import { FunctionDeclaration } from 'ts-morph';
import { flatToAlloy } from './flat-to-alloy';
import { fLabels } from './flat/flatprogram';
import { findVariables, makeScope, makeVariableSig, Scope } from './variables';

export interface FunctionTranslation {
  model: AlloyModel;
  stateSig: ASig,
  initPred: APred,
  stepPred: APred,
  atEndPred: APred,
  assertPred?: APred,
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

  const flat = typescriptToFlat(fn.getStatements());
  const alloyClauses = flatToAlloy(aIdent(pcVarName), flat, scope);
  initPred.clauses.push(aBinop('=', aAccess(stateVar, pcVarName), aIdent(flat.start)));

  const stepPred: APred = {
    type: 'pred',
    name: `${fn.getName()}_step`,
    parameters: [[stateVarName, stateSig.name]],
    clauses: [aOr(alloyClauses.transitions)],
  };

  let assertPred: APred | undefined;
  if (alloyClauses.assertions.length > 0) {
    assertPred = {
      type: 'pred',
      name: `${fn.getName()}_assert`,
      parameters: [[stateVarName, stateSig.name]],
      clauses: alloyClauses.assertions,
    };
  }

  pcSig.variants.push(...fLabels(flat), 'end');

  const atEndPred: APred = {
    type: 'pred',
    name: `${fn.getName()}_atEnd`,
    parameters: [[stateVarName, stateSig.name]],
    clauses: [aBinop('=', aAccess(stateVar, pcVarName), aIdent('end'))],
  };

  return {
    model: aModel([stateSig, pcSig], [initPred, stepPred, atEndPred, ...assertPred ? [assertPred] : []]),
    initPred,
    stepPred,
    stateSig,
    atEndPred,
    assertPred,
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