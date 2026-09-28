# Valida XML de ejemplo contra los XSD oficiales Hacienda CR v4.4
# Uso: powershell -File scripts/validate-fiscal.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$schemas = Join-Path $root "src\lib\fiscal\schemas\v4.4"
$tmp = Join-Path $root ".tmp-fiscal"

# 1. Generar XML de ejemplo
Push-Location $root
npx tsx scripts/fiscal-sample.ts $tmp
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

function Test-Xsd($xmlFile, $xsdFile, $targetNs) {
  $settings = New-Object System.Xml.XmlReaderSettings
  $settings.ValidationType = [System.Xml.ValidationType]::Schema
  $settings.Schemas.Add($targetNs, $xsdFile) | Out-Null
  $errors = @()
  $settings.add_ValidationEventHandler({
    param($sender, $e)
    $script:errors += "[$($e.Severity)] $($e.Message)"
  })
  $reader = [System.Xml.XmlReader]::Create($xmlFile, $settings)
  try { while ($reader.Read()) { } } finally { $reader.Close() }
  $name = Split-Path -Leaf $xmlFile
  if ($errors.Count -eq 0) {
    Write-Host "OK  $name" -ForegroundColor Green
    return $true
  }
  Write-Host "FAIL $name" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
  return $false
}

$ok = $true
$ok = (Test-Xsd (Join-Path $tmp "tiquete-v44.xml") (Join-Path $schemas "tiqueteElectronico.xsd") "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico") -and $ok
$ok = (Test-Xsd (Join-Path $tmp "factura-v44.xml") (Join-Path $schemas "facturaElectronica.xsd") "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica") -and $ok

if ($ok) { Write-Host "Validacion XSD v4.4: PASO" -ForegroundColor Green; exit 0 }
else { Write-Host "Validacion XSD v4.4: FALLA" -ForegroundColor Red; exit 1 }
