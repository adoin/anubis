#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

# Copy localization files to static directory
mkdir -p static/locales
cp ../lib/localization/locales/*.json static/locales/

for file in js/*.mjs js/worker/*.mjs; do
  # Convert .mjs extension to .js for output
  output_file=$(echo "${file}" | sed 's/\.mjs$/.js/')
  
  # First, bundle with esbuild targeting ES2015 (minimum viable target)
  esbuild "${file}" --sourcemap --target=es2015 --format=cjs --bundle --outfile=static/"${output_file}.tmp"
  
  # Then use Babel to transform only arrow functions and destructuring
  npx babel static/"${output_file}.tmp" --out-file static/"${output_file}" --compact=true
  
  # Remove temporary file
  rm static/"${output_file}.tmp"
  
  gzip -f -k -n static/${output_file}
  zstd -f -k --ultra -22 static/${output_file}
  brotli -fZk static/${output_file}
done
