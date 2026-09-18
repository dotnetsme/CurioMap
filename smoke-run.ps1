$PSDefaultParameterValues = @{ "Invoke-WebRequest:UseBasicParsing" = $true }
& (Join-Path $PSScriptRoot "scripts\smoke.ps1")
