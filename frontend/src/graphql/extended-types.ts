import { MeQuery, PostsQuery } from 'src/graphql/gen'

export type PaginatedPostResponse = NonNullable<NonNullable<NonNullable<PostsQuery['posts']['edges']>[0]>['node']>
