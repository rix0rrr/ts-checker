import { FStatement } from "./ast";

/**
 * Abstract model of a program in our "virtual machine"
 *
 * We translate from TS -> FlatProgram, and then FlatProgram -> Alloy.
 *
 * Flat program have jump labels. Jump labels may yield execution, or they may
 * not.
 */
export interface FlatProgram {
  chunks: {[label: string]: FStatement[]};
  start: string;
}

export function fLabels(p: FlatProgram) {
  return Object.keys(p.chunks);
}

export class FlatProgramBuilder {
  public program: FlatProgram;
  private currentChunk: string;
  private ctr = 0;

  constructor() {
    this.program = { chunks: { }, start: '' };
    this.currentChunk = '';

    this.doNewChunk();

    this.program.start = this.currentChunk;
  }

  public append(s: FStatement) {
    this.program.chunks[this.currentChunk].push(s);
  }

  public newChunk() {
    if (this.program.chunks[this.currentChunk].length === 0) {
      return;
    }

    this.doNewChunk();
  }

  private doNewChunk() {
    this.currentChunk = `P${this.ctr++}`;
    this.program.chunks[this.currentChunk] = [];
  }
}
