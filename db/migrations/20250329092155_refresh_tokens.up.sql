-- create "refresh_tokens" table
CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL, "updated_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL, "token_hash" character varying NOT NULL, "expires_at" timestamptz NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "ip_address" character varying NULL, "user_agent" character varying NULL, "owner_id" uuid NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "refresh_tokens_users_refresh_tokens" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION);
-- create index "refresh_tokens_token_hash_key" to table: "refresh_tokens"
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens" ("token_hash");
-- create index "refreshtoken_expires_at" to table: "refresh_tokens"
CREATE INDEX "refreshtoken_expires_at" ON "refresh_tokens" ("expires_at");
-- create index "refreshtoken_revoked_expires_at_owner_id" to table: "refresh_tokens"
CREATE INDEX "refreshtoken_revoked_expires_at_owner_id" ON "refresh_tokens" ("revoked", "expires_at", "owner_id");
-- create index "refreshtoken_token_hash" to table: "refresh_tokens"
CREATE INDEX "refreshtoken_token_hash" ON "refresh_tokens" ("token_hash");
