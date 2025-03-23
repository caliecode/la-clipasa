//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"log"
	"os"

	"entgo.io/contrib/entgql"
	"entgo.io/ent/entc"
	"entgo.io/ent/entc/gen"
	laclipasa "github.com/caliecode/la-clipasa"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
	"github.com/caliecode/la-clipasa/internal/ent/schema/annotations"
	"github.com/caliecode/la-clipasa/internal/utils/slices"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/theopenlane/entx"
	"github.com/theopenlane/entx/genhooks"
	"github.com/vektah/gqlparser/v2/ast"
	"go.uber.org/zap"
)

func loadEntgqlTemplates(dir string) ([]*gen.Template, error) {
	var templates []*gen.Template

	for _, name := range []string{"where_input"} {
		// we have to use entgql ParseFS since it initializes the templates internally
		tmpl, err := gen.NewTemplate(name).
			Funcs(entgql.TemplateFuncs).
			ParseFS(laclipasa.EntgqlTemplates, "internal/ent/entgql_templates/"+name+".tmpl")
		if err != nil {
			return nil, fmt.Errorf("parsing template %s: %w", name, err)
		}
		templates = append(templates, tmpl)
	}

	templates = append(
		templates,
		// []*gen.Template{entgql.WhereTemplate},
		entgql.CollectionTemplate,
		entgql.EnumTemplate,
		entgql.NodeTemplate,
		entgql.NodeDescriptorTemplate,
		entgql.PaginationTemplate,
		entgql.TransactionTemplate,
		entgql.EdgeTemplate,
		entgql.MutationInputTemplate,
	)

	return templates, nil
}

func main() {
	if err := os.Chdir("../../.."); err != nil {
		log.Fatalf("failed chdir: %v", err)
	}

	xExt, err := entx.NewExtension(entx.WithJSONScalar())
	if err != nil {
		log.Fatalf("creating entx extension: %v", err)
	}

	customTemplates, err := loadEntgqlTemplates("./internal/ent/entgql_templates")
	if err != nil {
		log.Fatalf("loading custom templates: %v", err)
	}

	entgqlExt, err := entgql.NewExtension(
		// have to manually create, since entgql's buildWhereInput just generates for db fields
		// regardless of what changes we make to the whereinput struct
		// TODO: add a @skipSoftDelete directive, in which we do have access to ctx
		// and return next(ctx).
		entgql.WithSchemaHook(
			func(graph *gen.Graph, s *ast.Schema) error {
				for _, n := range graph.Nodes {
					inputName := n.Name + "WhereInput"
					whereInput, ok := s.Types[inputName]
					if !ok {
						continue
					}

					if !slices.ContainsMatch(whereInput.Fields, func(f *ast.FieldDefinition) bool {
						return f.Name == "deletedAt"
					}) {
						continue
					}

					whereInput.Fields = append(whereInput.Fields,
						&ast.FieldDefinition{
							Description: "Include soft-deleted records",
							Name:        "includeDeleted",
							Type:        ast.NamedType("Boolean", nil),
							Directives: []*ast.Directive{
								{Name: "skipSoftDelete"},
							},
						},
						&ast.FieldDefinition{
							Description: "Include only soft-deleted records",
							Name:        "includeDeletedOnly",
							Type:        ast.NamedType("Boolean", nil),
							Directives: []*ast.Directive{
								{Name: "skipSoftDelete"},
							},
						},
					)
				}

				return nil
			},
		),
		entgql.WithSchemaGenerator(), // generates ent.graphql
		entgql.WithWhereInputs(true),
		entgql.WithNodeDescriptor(true),
		entgql.WithTemplates(customTemplates...),
		// required for extra gen
		entgql.WithConfigPath("gqlgen.yml"),
		entgql.WithSchemaPath("internal/gql/schema/ent.graphql"),
		entgql.WithSchemaHook(applyDirectives(map[string][]DirectiveField{
			"User": {
				// {
				// 	Targets: []DirectiveTarget{CreateInputObjectTarget, UpdateInputObjectTarget},
				// 	Directives: []entgql.Directive{
				// 		annotations.HasRoleDirective(user.RoleMODERATOR),
				// 	},
				// },
				{
					FieldName: "role",
					Targets:   []DirectiveTarget{CreateInputFieldTarget, UpdateInputFieldTarget},
					Directives: []entgql.Directive{
						annotations.HasRoleDirective(user.RoleADMIN),
					},
				},
			},
			// "ApiKey": {
			// 	{
			// 		Targets: []DirectiveTarget{TypeObjectTarget, CreateInputObjectTarget, UpdateInputObjectTarget},
			// 		Directives: []entgql.Directive{
			// 			annotations.HasRoleDirective(user.RoleADMIN),
			// 		},
			// 	},
			// },
		})),
		entgql.WithSchemaHook(xExt.GQLSchemaHooks()...),
	)
	if err != nil {
		log.Fatalf("creating entgql extension: %v", err)
	}

	log.Default().Printf("Running ent codegen...")
	if err := entc.Generate("./internal/ent/schema", &gen.Config{
		Target:    "./internal/ent/generated",
		Templates: entgql.AllTemplates,
		Package:   "github.com/caliecode/la-clipasa/internal/ent/generated",
		Hooks: []gen.Hook{
			genhooks.GenSchema("./internal/gql/schema/"),
			genhooks.GenQuery("./internal/gql/query/"),
			genhooks.GenSearchSchema("./internal/gql/schema/", "internal/gql/query/"),
		},
		Features: []gen.Feature{
			gen.FeatureVersionedMigration,
			gen.FeatureLock,
			gen.FeatureIntercept,
			// gen.FeatureSnapshot,
			gen.FeatureModifier,
			gen.FeaturePrivacy,
			gen.FeatureNamedEdges,
			gen.FeatureEntQL,
		},
	},
		entc.Extensions(
			entgqlExt,
		),
		entc.TemplateDir("./internal/ent/templates"),
		entc.Dependency(
			entc.DependencyName("Logger"),
			entc.DependencyType(&zap.SugaredLogger{}),
		),
		entc.Dependency(
			entc.DependencyName("DB"),
			entc.DependencyType(&pgxpool.Pool{}),
		),
	); err != nil {
		log.Fatalf("failed ent codegen: %v", err)
	}
}

type DirectiveTarget int

const (
	// Field targets
	TypeFieldTarget DirectiveTarget = iota
	CreateInputFieldTarget
	UpdateInputFieldTarget

	// Object targets
	TypeObjectTarget
	CreateInputObjectTarget
	UpdateInputObjectTarget
)

func HasMixedTargets(targets []DirectiveTarget) bool {
	var combinedBits uint

	for _, target := range targets {
		combinedBits |= 1 << target
	}

	hasFieldTargets := (combinedBits & FieldTargetsMask) != 0
	hasObjectTargets := (combinedBits & ObjectTargetsMask) != 0

	return hasFieldTargets && hasObjectTargets
}

const (
	FieldTargetsMask  = 1<<TypeFieldTarget | 1<<CreateInputFieldTarget | 1<<UpdateInputFieldTarget
	ObjectTargetsMask = 1<<TypeObjectTarget | 1<<CreateInputObjectTarget | 1<<UpdateInputObjectTarget
)

type DirectiveField struct {
	// database field name
	FieldName  string
	Targets    []DirectiveTarget
	Directives []entgql.Directive
}

func applyDirectives(entityDirectives map[string][]DirectiveField) entgql.SchemaHook {
	return func(graph *gen.Graph, s *ast.Schema) error {
		for typeName, directives := range entityDirectives {
			for dfIdx, df := range directives {
				if HasMixedTargets(df.Targets) {
					return fmt.Errorf("directive (%d) for %q has mixed targets", dfIdx, typeName)
				}
				for _, target := range df.Targets {
					var gqlType string
					switch target {
					case TypeFieldTarget, TypeObjectTarget:
						gqlType = typeName
					case CreateInputFieldTarget, CreateInputObjectTarget:
						gqlType = "Create" + typeName + "Input"
					case UpdateInputFieldTarget, UpdateInputObjectTarget:
						gqlType = "Update" + typeName + "Input"
					}

					t := s.Types[gqlType]
					if t == nil {
						return fmt.Errorf("type %q not found", gqlType)
					}
					var genType *gen.Type
					for _, element := range graph.Nodes {
						if element.Name == typeName {
							genType = element
							break
						}
					}

					if df.FieldName != "" {
						// assign to field
						if err := addDirectiveToField(t, df.FieldName, df.Directives); err != nil {
							return fmt.Errorf("couldn't add directive to %q: %w", gqlType, err)
						}

						// extra directives may be required. see vendor/entgo.io/contrib/entgql/schema.go
						desc := entgql.MutationDescriptor{
							Type:     genType,
							IsCreate: target == CreateInputFieldTarget || target == CreateInputObjectTarget,
						}
						inputFields, err := desc.InputFields()
						if err != nil {
							return fmt.Errorf("entgql.MutationDescriptor.InputFields: %w", err)
						}
						for _, ifield := range inputFields {
							pascalDfName := gen.Field{Name: df.FieldName}.StructField()
							if ifield.StructField() != pascalDfName {
								continue
							}

							if ifield.AppendOp {
								if err := addDirectiveToField(t, "append"+ifield.StructField(), df.Directives); err != nil {
									return fmt.Errorf("couldn't add append directive to %s.%s: %w", gqlType, df.FieldName, err)
								}
							}
							if ifield.ClearOp {
								if err := addDirectiveToField(t, "clear"+ifield.StructField(), df.Directives); err != nil {
									return fmt.Errorf("couldn't add clear directive to %s.%s: %w", gqlType, df.FieldName, err)
								}
							}
						}
					} else {
						// assign to object
						t.Directives = append(t.Directives, convertDirectives(df.Directives)...)
					}

				}
			}
		}
		return nil
	}
}

func convertDirectives(directives []entgql.Directive) []*ast.Directive {
	result := make([]*ast.Directive, len(directives))
	for i, d := range directives {
		result[i] = &ast.Directive{
			Name:      d.Name,
			Arguments: d.Arguments,
		}
	}
	return result
}

func addDirectiveToField(t *ast.Definition, fieldName string, directives []entgql.Directive) error {
	field := t.Fields.ForName(fieldName)
	if field == nil {
		return fmt.Errorf("field %q not found", fieldName)
	}
	field.Directives = append(field.Directives, convertDirectives(directives)...)
	return nil
}
