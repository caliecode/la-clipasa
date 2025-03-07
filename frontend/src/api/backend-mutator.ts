import Axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { apiPath } from 'src/services/apiPaths'

export const AXIOS_INSTANCE = Axios.create()

export type ApiHTTPError = {
  detail: string
  error: string
  loc: string[]
  status: number
  title: string
}

export class AxiosApiError extends Error {
  response?: AxiosError<ApiHTTPError>['response']
  constructor(message: string, response?: AxiosError<ApiHTTPError>['response']) {
    super(message)
    this.name = 'ApiError'
    this.response = response
  }
}

export class UrqlApiError extends Error {
  response?: ApiHTTPError
  constructor(message: string, response?: ApiHTTPError) {
    super(message)
    this.name = 'ApiError'
    this.response = response
  }
}
export const customInstance = <T>(config: AxiosRequestConfig, options?: AxiosRequestConfig): Promise<T> => {
  const source = Axios.CancelToken.source()
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
    baseURL: apiPath(),
  })
    .then(({ data }) => data)
    .catch((error: AxiosError) => {
      throw new AxiosApiError(error.message, error.response as any)
    })

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  promise.cancel = () => {
    source.cancel('Query was cancelled')
  }

  return promise
}

// must be called ErrorType for orval to replace. other options:
// https://github.com/anymaniax/orval/blob/b63ffe671e5eeb4e06730add9cb1b947b59798f5/docs/src/pages/guides/custom-axios.md?plain=1#L50
export type ErrorType<Error> = AxiosError<ApiHTTPError>
