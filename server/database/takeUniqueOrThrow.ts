export default function takeUniqueOrThrow<T extends unknown[]>(values: T): T[number] {
  if (values.length !== 1) throw new Error("non-unique or inexistent");
  return values[0];
}
