export class Code {
  public static render<A>(x: A, r: (x: A, code: Code) => void) {
    const code = new Code();
    r(x, code);
    return code.toString();
  }

  private readonly chunks = new Array<string>();
  private _indent = new Array<string>();

  public emit(x: string) {
    this.separate(() => this.linebreak, x.split('\n'), (y) => this.chunks.push(y));
  }

  public emitNewline() {
    this.emit(`\n`);
  }

  public get linebreak(): string {
    return '\n' + this._indent.join('');
  }

  public indent(x: number = 2) {
    this._indent.push(' '.repeat(x));
  }

  public unindent() {
    this._indent.pop();
  }

  public beginBlock(header: string = '') {
    this.emit(header);
    this.emit(' {');
    this.indent();
    this.emitNewline();
  }

  public endBlock() {
    this.unindent();
    this.emitNewline();
    this.emit('}');
  }

  public toString() {
    return this.chunks.join('');
  }

  /**
   * Separator is a function so that it can vary if indentation is changed while the block executes
   */
  public separate<A>(separator: () => string, xs: A[], block: (x: A) => void) {
    for (let i = 0; i < xs.length; i++) {
      if (i > 0) {
        this.chunks.push(separator());
      }
      block(xs[i]);
    }
  }
}