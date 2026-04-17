export type AnyRecord = Record<string, unknown>

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

export type Maybe<T> = T | null | undefined

export type MaybePromise<T> = T | Promise<T>

export type EntityId = string

export type ISODateString = `${number}-${number}-${number}`

export type ISODateTimeString = string

export type DeepPartial<T> =
  T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepPartial<U>>
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T
