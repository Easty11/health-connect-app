<#
.SYNOPSIS
  Query Hevy exercise templates by title substring and print id / type /
  primary muscle group for each match.

.DESCRIPTION
  Pages through GET /v1/exercise_templates (pageSize 100) and filters client-side
  on the title. Hevy has no server-side title filter, so every page is fetched
  and matched locally with a case-insensitive `-like "*<term>*"`.

  The API key is read from $env:HEVY_API_KEY. Set it once per shell session:
    $env:HEVY_API_KEY = "<your-key>"

.PARAMETER Search
  Title substring to match (case-insensitive). Default: "Pallof".

.EXAMPLE
  .\scripts\hevy-exercise-query.ps1
  Lists every template whose title contains "Pallof".

.EXAMPLE
  .\scripts\hevy-exercise-query.ps1 -Search "Romanian Deadlift"
  Lists every template whose title contains "Romanian Deadlift".
#>
[CmdletBinding()]
param(
  [string]$Search = 'Pallof'
)

$ErrorActionPreference = 'Stop'

$key = $env:HEVY_API_KEY
if ([string]::IsNullOrWhiteSpace($key)) {
  Write-Error 'HEVY_API_KEY is not set. Run:  $env:HEVY_API_KEY = "<your-key>"'
  exit 1
}

$headers = @{ 'api-key' = $key }
$found = @()
$page = 1

do {
  $uri  = "https://api.hevyapp.com/v1/exercise_templates?page=$page&pageSize=100"
  $resp = Invoke-RestMethod -Uri $uri -Headers $headers

  $found += $resp.exercise_templates |
    Where-Object { $_.title -like "*$Search*" }

  $page++
} while ($page -le $resp.page_count)

if ($found.Count -eq 0) {
  Write-Host "No exercise templates matched '*$Search*'."
  return
}

# Out-String -Width forces a wide virtual render so a narrow console can't
# squeeze/truncate the last column (else primary_muscle_group wraps to one
# char per line under Format-Table -AutoSize).
$found |
  Select-Object title, id, type, primary_muscle_group |
  Sort-Object title |
  Format-Table -AutoSize |
  Out-String -Width 4096 |
  Write-Host

Write-Host ""
Write-Host ("{0} template(s) matched '*{1}*'." -f $found.Count, $Search)
