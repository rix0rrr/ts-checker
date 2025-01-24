import { FunctionDeclaration, Node, SyntaxKind } from "ts-morph";
import { requireInt } from "./util";
import { AExpr, AObjectSig } from "./alloy/ast";
import { aAccess, aAddVars, aIdent } from "./alloy/ast-builder";

export function findVariables(root: Node): Variable[] {
  const ret: Variable[] = [];

  root.forEachDescendant((node, trav) => {
    if (Node.isVariableDeclaration(node)) {
      const init = node.getInitializer();
      if (!init) {
        throw new Error('All variables must have initializers');
      }

      const v = translateValue(init);

      ret.push({
        name: node.getName(),
        type: v.type,
        initialValue: v.value,
      });
    }

    if (Node.isFunctionDeclaration(node)) {
      trav.skip();
      return;
    }
  });

  return ret;
}

export interface Variable {
  name: string;
  type: string;
  initialValue: AExpr;
}


function translateValue(node: Node): Value {
  if (!node.getType().isNumberLiteral()) {
    throw new Error(`The only supported type is numbers`);
  }
  return {
    type: 'Int',
    value: {
      type: 'intlit',
      value: requireInt(node.asKindOrThrow(SyntaxKind.NumericLiteral).getLiteralValue()),
    },
  };
}

interface Value {
  type: string;
  value: AExpr;
}

export function makeScope(vs: Variable[], container: AExpr, containerType: string, parentScope?: Scope): Scope {
  return {
    parentScope,
    stateVar: container,
    stateType: containerType,
    variables: Object.fromEntries(vs.map(v => [v.name, v])),
  };
}

export interface Scope {
  parentScope?: Scope;
  stateVar: AExpr;
  stateType: string;
  variables: Record<string, Variable>;
}

export function findVarScope(scope: Scope, name: string): Scope {
  while (true) {
    if (scope.variables[name]) {
      return scope;
    }
    if (!scope.parentScope) {
      throw new Error(`Did not find a scope for variable ${name}`);
    }
    scope = scope.parentScope;
  }
}

export function allVarsInScope(scope: Scope): AExpr[] {
  const ret: AExpr[] = [];

  while (true) {
    ret.push(...Object.values(scope.variables).map(v => aIdent(v.name)));
    if (!scope.parentScope) {
      break;
    }

    scope = scope.parentScope;
  }

  return ret;
}

export function makeVariableSig(name: string, vars: Variable[]): AObjectSig {
  const ret: AObjectSig = {
    type: 'object',
    name,
    fields: {
    },
  };
  aAddVars(ret, vars);
  return ret;
}
