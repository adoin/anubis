#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

# Copy localization files to static directory
mkdir -p static/locales
cp ../lib/localization/locales/*.json static/locales/

for file in js/*.mjs js/worker/*.mjs; do
  # Convert .mjs extension to .js for output
  output_file=$(echo "${file}" | sed 's/\.mjs$/.js/')
  
  # Bundle all dependencies (including @aws-crypto/sha256-js for purejs worker)
  esbuild "${file}" --sourcemap --target=es5 --format=cjs --bundle --minify --outfile=static/"${output_file}"
  
  gzip -f -k -n static/${output_file}
  zstd -f -k --ultra -22 static/${output_file}
  brotli -fZk static/${output_file}
done
