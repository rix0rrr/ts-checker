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
  const pcVarName = 'pc';

  const variables = findVariables(fn);

  Object.assign(stateSig.fields, Object.fromEntries(variables.map(v => [v.name, {
    name: v.name,
    type: v.type,
    var: true,
  }])));
  const vars = variables.map(v => aIdent(v.name));
  initPred.clauses.push(...variables.map(v => aBinop('=', aAccess(stateVar, v.name), v.initialValue)));

  const flat = statementsToFlat(fn.getStatements());
  const stepDisjunction = flatToAlloy(aIdent(pcVarName), flat, stateVar, vars);
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

