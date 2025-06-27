/**
 * Functional Result type for proper error handling without exceptions
 * Following Railway Oriented Programming patterns
 */

export type Result<T, E = Error> = Success<T> | Failure<E>

export interface Success<T> {
  readonly kind: 'success'
  readonly value: T
}

export interface Failure<E> {
  readonly kind: 'failure'
  readonly error: E
}

// Factory functions
export const success = <T>(value: T): Success<T> => ({
  kind: 'success',
  value,
})

export const failure = <E>(error: E): Failure<E> => ({
  kind: 'failure',
  error,
})

// Result utilities
export const isSuccess = <T, E>(result: Result<T, E>): result is Success<T> =>
  result.kind === 'success'

export const isFailure = <T, E>(result: Result<T, E>): result is Failure<E> =>
  result.kind === 'failure'

// Functional operations
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  if (isSuccess(result)) {
    return success(fn(result.value))
  }
  return result
}

export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  if (isSuccess(result)) {
    return fn(result.value)
  }
  return result
}

export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  if (isFailure(result)) {
    return failure(fn(result.error))
  }
  return result as Result<T, F>
}

// Safe execution wrapper
export const safely = <T, E = Error>(
  fn: () => T,
  errorMapper?: (error: unknown) => E
): Result<T, E> => {
  try {
    return success(fn())
  } catch (error) {
    const mappedError = errorMapper
      ? errorMapper(error)
      : (error as E)
    return failure(mappedError)
  }
}

// Async safe execution
export const safelyAsync = async <T, E = Error>(
  fn: () => Promise<T>,
  errorMapper?: (error: unknown) => E
): Promise<Result<T, E>> => {
  try {
    const value = await fn()
    return success(value)
  } catch (error) {
    const mappedError = errorMapper
      ? errorMapper(error)
      : (error as E)
    return failure(mappedError)
  }
}

// Combine multiple results
export const combine = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = []
  for (const result of results) {
    if (isFailure(result)) {
      return result
    }
    values.push(result.value)
  }
  return success(values)
}

// Get value or default
export const getOrElse = <T, E>(
  result: Result<T, E>,
  defaultValue: T
): T => {
  return isSuccess(result) ? result.value : defaultValue
}

// Get value or throw (for imperative shell)
export const getOrThrow = <T, E>(
  result: Result<T, E>,
  errorMessage?: string
): T => {
  if (isSuccess(result)) {
    return result.value
  }
  throw new Error(errorMessage || String(result.error))
}
