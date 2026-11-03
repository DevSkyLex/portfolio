#!/usr/bin/env bash
# Creates the development secrets (docker/dev/secrets, git-ignored) from the committed placeholders in
# docker/dev/secrets.example. Existing files are kept, so local changes survive.
#   bash docker/scripts/dev-secrets.sh
set -euo pipefail
cd "$(dirname "$0")/../dev"

mkdir -p secrets
created=0
for example in secrets.example/*; do
  name=$(basename "$example")
  if [ ! -e "secrets/$name" ]; then
    cp "$example" "secrets/$name"
    created=$((created + 1))
  fi
done
echo "Development secrets: $created created in docker/dev/secrets."
