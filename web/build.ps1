#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

# Copy localization files to static directory
New-Item -ItemType Directory -Force -Path "static/locales" | Out-Null
Copy-Item "../lib/localization/locales/*.json" "static/locales/"

# Get all .mjs files in js directory and js/worker directory
$patterns = @("js/*.mjs", "js/worker/*.mjs")

foreach ($pattern in $patterns) {
    $mjsFiles = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    
    foreach ($file in $mjsFiles) {
        # Get relative path from current directory
        $relativePath = $file.FullName.Substring($PSScriptRoot.Length + 1) -replace '\\', '/'
        
        # Convert .mjs extension to .js for output
        $outputFile = $relativePath -replace '\.mjs$', '.js'
        $outputPath = "static/$outputFile"
        
        # Ensure output directory exists
        $outputDir = Split-Path -Parent $outputPath
        if ($outputDir) {
            New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
        }
        
        Write-Host "Building $relativePath -> static/$outputFile"
        
        # Run esbuild
        npx esbuild $file.FullName --sourcemap --target=es2015 --format=cjs --bundle --minify --outfile=$outputPath
        
        # Compress files
        if (Get-Command gzip -ErrorAction SilentlyContinue) {
            gzip -f -k -n $outputPath
        } else {
            Write-Warning "gzip not found, skipping gzip compression"
        }
        
        if (Get-Command zstd -ErrorAction SilentlyContinue) {
            zstd -f -k --ultra -22 $outputPath
        } else {
            Write-Warning "zstd not found, skipping zstd compression"
        }
        
        if (Get-Command brotli -ErrorAction SilentlyContinue) {
            brotli -fZk $outputPath
        } else {
            Write-Warning "brotli not found, skipping brotli compression"
        }
    }
}

Write-Host "Web assets built successfully!"

