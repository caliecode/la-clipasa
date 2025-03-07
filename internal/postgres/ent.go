package postgresql

import "entgo.io/ent/dialect/sql"

func TrigramSimilarity(field, value string) func(*sql.Selector) {
	return func(s *sql.Selector) {
		s.Where(sql.ExprP(field+" % ?", value))
	}
}
