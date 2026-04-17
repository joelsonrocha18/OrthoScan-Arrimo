import type { Result } from '../errors'
import type { EntityId, MaybePromise } from '../types'

export interface RepositoryPort<TEntity, TId extends EntityId = EntityId> {
  findById(id: TId): MaybePromise<TEntity | null>
}

export interface WritableRepositoryPort<TEntity, TCreate, TUpdate, TId extends EntityId = EntityId>
  extends RepositoryPort<TEntity, TId> {
  create(input: TCreate): MaybePromise<Result<TEntity, string>>
  update(id: TId, input: TUpdate): MaybePromise<Result<TEntity, string>>
  delete(id: TId): MaybePromise<Result<null, string>>
}

export type RepositoryResult<Output, ErrorType = string> = Result<Output, ErrorType>
