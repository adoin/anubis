#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "Building XESS CSS..."
npx postcss ./xess.css -o xess.min.css

Write-Host "XESS CSS built successfully!"

