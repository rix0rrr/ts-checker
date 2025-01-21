import { AlloyModel, AExpr, APred, ASig } from './alloy/ast';
import { aBinop, aAccess, aIdent, aModel } from './alloy/ast-builder';
import { requireInt, ucfirst } from './util';
import { statementsToFlat } from './typescript-to-flat';
import { Node, FunctionDeclaration, SyntaxKind } from 'ts-morph';
import { flatToAlloy } from './flat-to-alloy';
import { fLabels } from './flat/flatprogram';

export interface FunctionTranslation {
  model: AlloyModel;
  stateSig: ASig,
  initPred: APred,
  stepPred: APred,
  atEndPred: APred,
}

// FIXME: Global vars
export function translateFunction(fn: FunctionDeclaration): FunctionTranslation {
  const name = ucfirst(fn.getName() ?? 'xxx');

  const stateVarName = 'st';

  const pcSig: ASig = {
    type: 'enum',
    name: `${name}PC`,
    variants: []
  };

  // Just do statements for now
  const stateSig: ASig = {
    type: 'object',
    name: `${name}Op`,
    fields: {
      pc: { name: 'pc', type: pcSig.name, var: true },
    },
  };

  const initPred: APred = {
    type: 'pred',
    name: `${fn.getName()}_init`,
    parameters: [ [stateVarName, stateSig.name] ],
    clauses: [],
  };

  const stateVar = aIdent(stateVarName);
  const pcVar = aAccess(stateVar, 'pc');

  const stutterPred: APred = {
    type: 'pred',
    name: `${fn.getName()}_stutter`,
    parameters: [ [stateVarName, stateSig.name] ],
    clauses: [],
  };

  const instanceVars: AExpr[] = [];
  const variables = findVariables(fn);
  for (const v of variables) {
    const varName = v.name;

    stateSig.fields[varName] = {
      name: varName,
      type: v.type,
      var: true,
    };

    const instVar = aAccess(stateVar, varName);
    initPred.clauses.push(aBinop('=', instVar, v.initialValue));
    instanceVars.push(instVar);
  }

  const flat = statementsToFlat(fn.getStatements());
  const alloy = flatToAlloy(pcVar, flat, stateVar, instanceVars);

  initPred.clauses.push(aBinop('=', pcVar, aIdent(flat.start)));

  const stepPred: APred = {
    type: 'pred',
    name: `${fn.getName()}_step`,
    parameters: [[stateVarName, stateSig.name]],
    clauses: [alloy],
  };

  pcSig.variants.push(...fLabels(flat), 'end');

  const atEndPred: APred = {
    type: 'pred',
    name: `${fn.getName()}_atEnd`,
    parameters: [[stateVarName, stateSig.name]],
    clauses: [aBinop('=', pcVar, aIdent('end'))],
  };

  return {
    model: aModel([stateSig, pcSig], [initPred, stepPred]),
    initPred,
    stepPred,
    stateSig,
    atEndPred,
  };
}

function findVariables(fn: FunctionDeclaration): Variable[] {
  const ret: Variable[] = [];

  fn.forEachDescendant((node, trav) => {
    if (Node.isVariableDeclaration(node)) {
      const init = node.getInitializer();
      if (!init) {
        throw new Error('All variables must have initializers');
      }
      if (!init.getType().isNumberLiteral()) {
        throw new Error(`The only supported type is numbers`);
      }

      ret.push({
        name: node.getName(),
        type: 'Int',
        initialValue: {
          type: 'intlit',
          value: requireInt(init.asKindOrThrow(SyntaxKind.NumericLiteral).getLiteralValue()),
        }
      });
    }
  });

  return ret;
}

interface Variable {
  name: string;
  type: string;
  initialValue: AExpr;
}

