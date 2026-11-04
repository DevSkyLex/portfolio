#!/usr/bin/env bash
# Switches the static site to a release already copied to SITE_ROOT/releases/<name> (`site-build`
# workflow, playbooks/publish-site.yml), or back to an older one (rollback):
#   bash scripts/publish-site.sh <name>
#   bash scripts/publish-site.sh "$(basename "$(readlink /srv/apps/portfolio/production/site/previous)")" # rollback
# Atomic switch of the `current` link; `previous` points to the release it replaced (Nginx still serves
# its hashed files to pages loaded before the switch). The SITE_KEEP_RELEASES (5) most recently
# published releases are kept; `current` and `previous` are never deleted.
set -euo pipefail

release="${1:?release name required}"
root="${SITE_ROOT:-/srv/apps/portfolio/production/site}"
keep="${SITE_KEEP_RELEASES:-5}"
[[ "$release" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || { echo "Invalid release name: $release" >&2; exit 1; }
dir="$root/releases/$release"
[ -f "$dir/browser/index.html" ] || { echo "Incomplete release: $dir" >&2; exit 1; }

current=$(readlink "$root/current" 2> /dev/null || true)
if [ "$current" = "releases/$release" ]; then
  echo "Site already on $release."
  exit 0
fi

# Pre-compressed copies for gzip_static (served without compressing on each request).
find "$dir/browser" -type f -size +1k \
  \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.json' \
  -o -name '*.txt' -o -name '*.xml' -o -name '*.ico' -o -name '*.webmanifest' \) \
  -exec gzip -9 --keep --no-name --force {} +

if [ -n "$current" ]; then
  ln -sfn "$current" "$root/previous.tmp"
  mv -T "$root/previous.tmp" "$root/previous"
fi
touch "$dir"
ln -sfn "releases/$release" "$root/current.tmp"
mv -T "$root/current.tmp" "$root/current"
echo "Site published: $release"

# Old releases, by publication date (most recent first).
previous=$(readlink "$root/previous" 2> /dev/null || true)
find "$root/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@\t%f\n' | sort -rn | cut -f2 \
  | tail -n +"$((keep + 1))" | while read -r old; do
    case "releases/$old" in
      "releases/$release" | "$previous") ;;
      *) rm -rf "${root:?}/releases/$old" && echo "Removed release: $old" ;;
    esac
  done
