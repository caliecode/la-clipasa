# Dataloaders

To solve N+1, that's
https://entgo.io/docs/tutorial-todo-gql-field-collection/

# Graphql integration

See:
 - https://entgo.io/docs/tutorial-todo-gql
    - Referenced: shttps://github.com/ent/contrib/tree/master/entgql/internal/todo

# Migrations linting

See https://entgo.io/docs/versioned/verifying-safety. Uses atlas linter

# Generated/custom columns

Apparently by using versioned migrations with atlas its supported (tsvector,
etc.)?
https://github.com/ent/ent/issues/2911#issuecomment-1656555607

See https://github.com/ent/ent/issues/3168 (untested with graphql)

# Instrospection in resolvers

NOTE: for counts, add the following to edges. do not create an extended object.
that will lead to N+1.
This way we can query `totalCount` because we will have a `<Entity>Connection`.
Results will be the same as doing `r.ent.Post.QueryLikedBy(obj).Count(ctx)`:

```json
// --likeCount--
// likedBy {
//   totalCount
// }
"--likeCount--": 13,
"likedBy": {
  "totalCount": 13
},
```

```go
Annotations(
  entgql.RelayConnection(),
  entgql.OrderField("<ENTITY>_COUNT"), // must match uppercase of entity
),
```
with op ctx, we cannot aggregate at the same time we paginate. Must might come
in handy.

```go
fc := graphql.GetFieldContext(ctx)
opCtx := graphql.GetOperationContext(ctx)
var edgesFields []graphql.CollectedField
collected := graphql.CollectFields(opCtx, fc.Field.Selections, []string{"Post"})
for _, f := range collected {
  if f.Field.Name == "edges" {
    edgeFields := graphql.CollectFields(opCtx, f.Field.SelectionSet, nil)
    for _, ef := range edgeFields {
      if ef.Field.Name == "node" {
        edgesFields = graphql.CollectFields(opCtx, ef.Field.SelectionSet, nil)
      }
    }
  }
}
withLikeCount := false
withCommentCount := false
for _, f := range edgesFields {
  switch f.Field.Name {
  case "likeCount":
    withLikeCount = true
  case "commentCount":
    withCommentCount = true
  }
}
```
