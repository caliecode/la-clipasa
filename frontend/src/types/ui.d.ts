import type { AxiosError } from 'axios'
import type { AxiosApiError } from 'src/api/backend-mutator'
import type { ValidationErrors } from 'src/client-validator/validate'
import type { User } from 'src/graphql/gen'

type AppError = AxiosApiError | AxiosError // TODO: react hook form errors instead of validationerrors

type IUser = Pick<User, 'id' | 'displayName' | 'awards' | 'role'>
