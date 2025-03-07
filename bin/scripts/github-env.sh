#!/bin/bash

REPO_OWNER="caliecode"
REPO_NAME="la-clipasa"
ENV_NAME="production"
ENV_FILE=".env"

while IFS= read -r line || [ -n "$line" ]; do
  if [[ ! "$line" =~ ^# && "$line" =~ .*=.* ]]; then
    VAR_NAME=$(echo "$line" | cut -d '=' -f 1)
    VAR_VALUE=$(echo "$line" | cut -d '=' -f 2-)

    GH_TOKEN="$GITHUB_TOKEN" gh secret set "$VAR_NAME" --body "$VAR_VALUE" --env "$ENV_NAME" --repo "$REPO_OWNER/$REPO_NAME"
  fi
done <"$ENV_FILE"
