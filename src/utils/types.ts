export type Prettify<T> = {
  [K in keyof T]: T[K];
} & object;

export type UnwrapArray<T> = T extends (infer U)[] ? U : never;