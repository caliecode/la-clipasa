-- Drop index "api_keys_owner_id_key" from table: "api_keys"
DROP INDEX "api_keys_owner_id_key";
-- Modify "api_keys" table
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_users_api_key", ADD CONSTRAINT "api_keys_users_api_keys" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION;
