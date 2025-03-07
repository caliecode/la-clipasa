import { graphqlSync, getIntrospectionQuery, buildSchema } from 'graphql'
import * as path from 'path'
import { fromIntrospectionQuery } from 'graphql-2-json-schema'
import { readdirSync, readFileSync, writeFileSync } from 'fs'
const options = {
  // Whether or not to ignore GraphQL internals that are probably not relevant
  // to documentation generation.
  // Defaults to `true`
  ignoreInternals: true,
  // Whether or not to properly represent GraphQL Lists with Nullable elements
  // as type "array" with items being an "anyOf" that includes the possible
  // type and a "null" type.
  // Defaults to `false` for backwards compatibility, but in future versions
  // the effect of `true` is likely going to be the default and only way. It is
  // highly recommended that new implementations set this value to `true`.
  nullableArrayItems: true,
  // Indicates how to define the `ID` scalar as part of a JSON Schema. Valid options
  // are `string`, `number`, or `both`. Defaults to `string`
  idTypeMapping: 'string',
}

function loadSchemaFiles(folderPath) {
  const schemaFiles = readdirSync(folderPath)
    .filter((file) => file.endsWith('.graphql'))
    .map((file) => readFileSync(path.join(folderPath, file), 'utf-8'))
  return schemaFiles.join('\n')
}

const schema = buildSchema(loadSchemaFiles('../internal/gql/schema/'))
const introspection = graphqlSync({ schema, source: getIntrospectionQuery() }).data
const jsonSchema = fromIntrospectionQuery(introspection, options)

const apiSchema = JSON.stringify(jsonSchema, null, 2)
writeFileSync('../api-schema.json', apiSchema)
