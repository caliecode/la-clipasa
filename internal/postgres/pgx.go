package postgresql

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type DBTX interface {
	Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error)
	Query(context.Context, string, ...interface{}) (pgx.Rows, error)
	QueryRow(context.Context, string, ...interface{}) pgx.Row
}

func rowsToJSON(rows pgx.Rows) []byte {
	var result any

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			result = "rows.Values: " + err.Error()
		}
		for _, v := range values {
			result = v
		}
	}

	json, _ := json.MarshalIndent(result, "", "  ")

	return json
}

// DynamicQuery returns an SQL query result as JSON.
func DynamicQuery(d DBTX, query string) (string, error) {
	rows, err := d.Query(context.Background(), fmt.Sprintf("select row_to_json(t) from (%s) as t", query))
	if err != nil {
		return "", fmt.Errorf("d.Query: %w", err)
	}

	return string(rowsToJSON(rows)), nil
}
