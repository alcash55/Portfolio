#!/usr/bin/env bash
# Publishes a Unity WebGL build as the "latest" Golem Miners browser build.
#
# The Worker serves /play/golem-miners/Build/* from the release tagged
# golem-miners-webgl-latest (frontend/src/lib/golemBuild.ts), so uploading here
# is the whole deploy: no Portfolio rebuild or wrangler run is needed.
#
# Usage: scripts/publish-golem-build.sh <path to the build's Build/ folder> [commit sha]
# Auth:  gh must be logged in, or GH_TOKEN set, with contents:write on alcash55/Portfolio.
#        A CI job in another repo needs a fine-grained token for that repo.
set -euo pipefail

repo="alcash55/Portfolio"
tag="golem-miners-webgl-latest"
dir="${1:?usage: publish-golem-build.sh <Build dir> [commit sha]}"
sha="${2:-unknown}"
files=(WebGL.data.unityweb WebGL.framework.js.unityweb WebGL.wasm.unityweb WebGL.loader.js)

for f in "${files[@]}"; do
  [[ -s "$dir/$f" ]] || { echo "missing or empty: $dir/$f" >&2; exit 1; }
done

# The Worker declares Content-Encoding: gzip for the .unityweb files. A build made with
# brotli or no compression would load as garbage in the browser, so fail here instead.
for f in "${files[@]}"; do
  if [[ "$f" == *.unityweb ]]; then
    gzip -t "$dir/$f" 2>/dev/null || {
      echo "$f is not gzip. In Unity set Player Settings > Publishing > Compression Format to Gzip." >&2
      exit 1
    }
  fi
done

notes="Unity WebGL build from Golem-Miners commit ${sha}, published $(date -u +%Y-%m-%dT%H:%MZ)."
if gh release view "$tag" -R "$repo" >/dev/null 2>&1; then
  gh release edit "$tag" -R "$repo" --notes "$notes" >/dev/null
else
  gh release create "$tag" -R "$repo" --target main --latest=false \
    --title "Golem Miners WebGL build (latest)" --notes "$notes" >/dev/null
fi

paths=()
for f in "${files[@]}"; do paths+=("$dir/$f"); done
gh release upload "$tag" -R "$repo" --clobber "${paths[@]}"
echo "Published. Live at /play/golem-miners/ within the cache window (about an hour)."
