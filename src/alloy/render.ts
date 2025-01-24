import { Code } from '../code';
import { assertNever } from '../util';
import { AExpr, AlloyModel, APred, ASig } from './ast';

export function renderModel(x: AlloyModel, code: Code) {
  code.separate(() => '\n\n', Object.values(x.sigs), (s) => renderSig(s, code));
  code.emitNewline();
  code.emitNewline();
  code.separate(() => '\n\n', Object.values(x.preds), (p) => emitPred(p, code));
}

export function renderSig(x: ASig, code: Code) {
  switch (x.type) {
    case 'object':
      if (x.one) {
        code.emit('one ');
      }
      code.beginBlock(`sig ${x.name}`);
      code.separate(() => `,${code.linebreak}`, Object.values(x.fields), f => {
        if (f.var) {
          code.emit('var ');
        }
        code.emit(`${f.name}: ${f.type}`);
      });
      code.endBlock();
      break;
    case 'enum':
      code.emit(`enum ${x.name} { ${x.variants.join(', ')} }`);
      break;

    default:
      assertNever(x);
  }
}

export function emitPred(x: APred, code: Code) {
  code.emit(`pred ${x.name}`);
  if (x.parameters && x.parameters.length > 0) {
    code.emit('[');
    code.separate(() => ', ', x.parameters, ([name, type]) => {
      code.emit(`${name}: ${type}`);
    });
    code.emit(']');
  }
  code.beginBlock();

  code.separate(() => code.linebreak, x.clauses, (c) => {
    emitExpr(c, code);
  });

  code.endBlock();
}

export function emitExpr(x: AExpr, code: Code): void {
  const recurse = (y: AExpr) => emitExpr(y, code);

  switch (x.type) {
    case 'access':
      recurse(x.lhs);
      code.emit(`.${x.prop}`);
      break;
    case 'and':
      if (x.clauses.length > 3) {
        code.emit('{');
        code.indent();
        code.emitNewline();
        code.separate(() => code.linebreak, x.clauses, recurse);
        code.endBlock();
        break;
      }
      code.emit('(');
      code.separate(() => ` ${x.type} `, x.clauses, recurse);
      code.emit(')');
      break;
    case 'or':
      code.emit('(');
      code.separate(() => ` ${x.type} `, x.clauses, recurse);
      code.emit(')');
      break;
    case 'ident':
      code.emit(x.id);
      break;
    case 'prime':
      recurse(x.inner);
      code.emit('\'');
      break;
    case 'intlit':
      code.emit(`${x.value}`);
      break;
    case 'call':
      code.emit(x.pred);
      if (x.args.length > 0) {
        code.emit('[');
        code.separate(() => ', ', x.args, recurse);
        code.emit(']');
      }
      break;

    case '=':
    case 'in':
    case '=>':
    case '++':
    case '->':
      recurse(x.lhs);
      code.emit(` ${x.type} `);
      recurse(x.rhs);
      break;

    case 'qual':
      code.emit(`${x.qual} ${x.var}: ${x.set} | `);
      emitExpr(x.pred, code);
      break;

    case 'time':
      code.emit(`${x.qual} `);
      emitExpr(x.pred, code);
      break;

    default:
      assertNever(x);
  }
}