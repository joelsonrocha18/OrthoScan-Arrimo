import type { Result } from '../errors'
import type { MaybePromise } from '../types'

export interface UseCase<Input, Output> {
  execute(input: Input): MaybePromise<Output>
}

export interface ResultUseCase<Input, Output, ErrorType = string> {
  execute(input: Input): MaybePromise<Result<Output, ErrorType>>
}

export type UseCaseResult<Output, ErrorType = string> = Result<Output, ErrorType>
