param(
  [string]$BaseUrl = 'https://electroductsint.github.io/ElectroWallet'
)

$errors = @()
Function CheckUrl($u) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 15
    if ($r.StatusCode -ne 200) { $errors += "$u returned $($r.StatusCode)" }
    return $r
  } catch {
    $errors += "$u -> $($_.Exception.Message)"
    return $null
  }
}

Write-Output "Checking base: $BaseUrl/"
$root = CheckUrl "$BaseUrl/"
if ($root -and $root.Content -match '<title>(.*?)</title>') { Write-Output "Title: $($Matches[1])" }

Write-Output "Checking index.css"
CheckUrl "$BaseUrl/index.css" | Out-Null

if ($root) {
  if ($root.Content -notmatch '/assets/') { $errors += "index.html does not reference /assets/" }
}

if ($errors.Count -gt 0) {
  Write-Error "Some checks failed:`n$($errors -join "`n")"
  exit 1
}

Write-Output "All checks passed"
exit 0
