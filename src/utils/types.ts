export type Prettify<T> = {
  [K in keyof T]: T[K];
} & object;

export type UnwrapArray<T> = T extends (infer U)[] ? U : never;

export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];
