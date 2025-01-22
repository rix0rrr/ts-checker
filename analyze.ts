import ts from 'typescript';
import { DiagnosticCategory, Project } from "ts-morph";
import { FunctionTranslation, translateFunction } from './translate-function';
import { renderModel } from './alloy/render';
import { Code } from './code';
import { aMergeModel, aModel } from './alloy/ast-builder';
import { combineFunctions } from './alloy/combine-pred';

async function main() {
  const args = process.argv.slice(2);

  const project = new Project();
  const sourcesOfInterest = project.addSourceFilesAtPaths(args);
  project.addSourceFilesAtPaths('types.d.ts');
  project.resolveSourceFileDependencies();

  const diagnostics = project.getPreEmitDiagnostics();
  console.log(project.formatDiagnosticsWithColorAndContext(diagnostics));

  if (diagnostics.some(d => d.getCategory() === DiagnosticCategory.Error)) {
    process.exitCode = 1;
    return;
  }

  const model = aModel([], []);
  const functions: FunctionTranslation[] = [];

  for (const source of sourcesOfInterest) {
    const fns = source.getChildrenOfKind(ts.SyntaxKind.FunctionDeclaration);
    for (const fn of fns) {
      const t = translateFunction(fn);
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