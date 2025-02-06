import { DiagnosticCategory, Project, SyntaxKind } from "ts-morph";
import { makeInitPred, translateFunction } from './translate-function';
import { renderModel } from './alloy/render';
import { Code } from './code';
import { aIdent, aMergeModel, aModel } from './alloy/ast-builder';
import { combineFunctions, StateMachine } from './alloy/combine-pred';
import { findVariables, makeScope, makeVariableSig } from './variables';

async function main() {
  const args = process.argv.slice(2);

  const project = new Project();
  const sourcesOfInterest = project.addSourceFilesAtPaths(args);
  project.addSourceFilesAtPaths(`${__dirname}/../library/types.d.ts`);
  project.resolveSourceFileDependencies();

  const diagnostics = project.getPreEmitDiagnostics();
  console.log(project.formatDiagnosticsWithColorAndContext(diagnostics));

  if (diagnostics.some(d => d.getCategory() === DiagnosticCategory.Error)) {
    process.exitCode = 1;
    return;
  }

  const model = aModel([], []);
  const functions: StateMachine[] = [];

  for (const source of sourcesOfInterest) {
    const globalVars = findVariables(source);
    const globalScope = makeScope(globalVars, aIdent('Global'), 'Global');
    if (globalVars.length > 0) {
      const globalName = 'Global';
      const globalInitName = 'global_init';

      model.sigs[globalName] = makeVariableSig(globalName, globalVars);
      model.sigs[globalName].one = true;
      model.preds[globalInitName] = makeInitPred(globalInitName, globalScope);

      functions.push({
        initPred: model.preds[globalInitName] ,
      });
    }

    for (const fn of source.getChildrenOfKind(SyntaxKind.FunctionDeclaration)) {
      const t = translateFunction(fn, globalScope);
      aMergeModel(model, t.model);
      functions.push(t);
    }
  }

  aMergeModel(model, combineFunctions(functions));
  console.log(Code.render(model, renderModel));
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});