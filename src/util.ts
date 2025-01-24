export function ucfirst(x: string) {
  return x.slice(0, 1).toUpperCase() + x.slice(1);
}

export function requireInt(x: number) {
  if (Math.floor(x) !== x) {
    throw new Error(`Supports only integers, found: ${x}`);
  }
  return x;
}

export function assertNever(value: never) {
  throw new Error("Unexpected value: " + value);
}

export function nonNull<A>(x: A): NonNullable<A> {
  if (x == null) {
    throw new Error('Expecting non-null value');
  }
  return x;
}

export function isDefined<A>(x: A): x is NonNullable<A> {
  return x != null;
}