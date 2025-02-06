declare function uniqueString(): string;

declare function atomic(cb: () => void): void;

interface Table<T, PK extends keyof T, SK extends keyof T = never> {
  get(key: Pick<T, PK | SK>): T | undefined;
  put(value: T): void;
  putIfNew(value: T): boolean;
  conditionalUpdate(k: Pick<T, PK | SK>, updates: Partial<T>, condition: (x: T) => boolean): boolean;
}

interface TableBuilder<T, PK extends keyof T = never, SK extends keyof T = never> {
  partitionKey<A extends keyof T>(pk: A): TableBuilder<T, A, SK>;
  sortKey<A extends keyof T>(sk: A): TableBuilder<T, PK, A>;
  done(): Table<T, PK, SK>;
}

declare function table<T>(): TableBuilder<T>;

declare function staticCollection<T>(): T[];

declare function later(cb: () => void): void;

declare function assert(b: boolean): void;