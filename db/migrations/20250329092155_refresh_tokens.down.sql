-- reverse: create index "refreshtoken_token_hash" to table: "refresh_tokens"
DROP INDEX "refreshtoken_token_hash";
-- reverse: create index "refreshtoken_revoked_expires_at_owner_id" to table: "refresh_tokens"
DROP INDEX "refreshtoken_revoked_expires_at_owner_id";
-- reverse: create index "refreshtoken_expires_at" to table: "refresh_tokens"
DROP INDEX "refreshtoken_expires_at";
-- reverse: create index "refresh_tokens_token_hash_key" to table: "refresh_tokens"
DROP INDEX "refresh_tokens_token_hash_key";
-- reverse: create "refresh_tokens" table
DROP TABLE "refresh_tokens";
