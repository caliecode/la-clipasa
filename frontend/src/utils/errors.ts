import { GraphQLError } from 'graphql'
import { CalloutError } from 'src/slices/form'

export function extractGqlErrors(graphQLErrors: GraphQLError[]): string[] {
  return graphQLErrors
    .map((e) => {
      if (e.path?.[0] === 'variable') {
        return `${e.path?.join('.')}: ${e.message}`
      }
      return e.message || 'An unknown error occurred'
    })
    .filter((t) => t !== undefined)
}
