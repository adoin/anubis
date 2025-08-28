#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

# Copy localization files to static directory
mkdir -p static/locales
cp ../lib/localization/locales/*.json static/locales/

# Clean up any existing temporary files
find static -name "*.tmp" -delete 2>/dev/null || true
find static -name "*.tmp.map" -delete 2>/dev/null || true

# Find all .mjs files recursively
while IFS= read -r -d '' file; do
  # Convert .mjs extension to .js for output
  output_file=$(echo "${file}" | sed 's/\.mjs$/.js/')
  
  # Step 1: 原始代码 -> 编译es2015产物
  esbuild "${file}" --sourcemap --target=es2015 --format=cjs --bundle --outfile=static/"${output_file}.tmp"
  
  # Step 2: babel处理箭头函数和解构声明
  npx babel static/"${output_file}.tmp" --out-file static/"${output_file}"
  
  # Step 3: 清理临时文件并压缩
  rm -f static/"${output_file}.tmp"
  rm -f static/"${output_file}.tmp.map"
  
  gzip -f -k -n static/${output_file}
  
  # Optional compression (skip if tools not available)
  if command -v zstd >/dev/null 2>&1; then
    zstd -f -k --ultra -22 static/${output_file}
  fi
  
  if command -v brotli >/dev/null 2>&1; then
    brotli -fZk static/${output_file}
  fi
done < <(find js -name "*.mjs" -print0)

# Final cleanup of any remaining temporary files
find static -name "*.tmp" -delete 2>/dev/null || true
find static -name "*.tmp.map" -delete 2>/dev/null || true