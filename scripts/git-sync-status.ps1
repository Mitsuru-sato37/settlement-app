param([switch]$NoFetch)
$ErrorActionPreference = "Stop"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Host "Git was not found in PATH."; exit 1 }
$root = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $root) { Write-Host "Run this command inside a Git repository."; exit 1 }
$root = ($root | Select-Object -First 1).Trim()
Push-Location $root
try {
    $fetchStatus = "SKIPPED"
    if (-not $NoFetch) { & git fetch origin --prune *> $null; $fetchStatus = if ($LASTEXITCODE -eq 0) { "OK" } else { "FAILED" } }
    $repo = Split-Path $root -Leaf
    $branchName = ((& git branch --show-current 2>$null) | Select-Object -First 1).Trim()
    if (-not $branchName) { $branchName = "(detached HEAD)" }
    $changes = @(& git status --porcelain 2>$null)
    $workingTree = if ($changes.Count -eq 0) { "CLEAN" } else { "CHANGES ($($changes.Count))" }
    $upstream = $null
    $upstreamRaw = & git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null
    if ($LASTEXITCODE -eq 0 -and $upstreamRaw) { $upstream = ($upstreamRaw | Select-Object -First 1).Trim() }
    elseif ($branchName -ne "(detached HEAD)") { & git show-ref --verify --quiet "refs/remotes/origin/$branchName"; if ($LASTEXITCODE -eq 0) { $upstream = "origin/$branchName" } }
    $pullStatus = "UNKNOWN (no upstream)"; $pushStatus = "UNKNOWN (no upstream)"
    if ($upstream) {
        $countsRaw = ((& git rev-list --left-right --count "$upstream...HEAD" 2>$null) | Select-Object -First 1).Trim()
        if ($LASTEXITCODE -eq 0 -and $countsRaw) {
            $counts = $countsRaw -split "\s+"; $behind = [int]$counts[0]; $ahead = [int]$counts[1]
            $pullStatus = if ($behind -eq 0) { "OK" } else { "NEEDED ($behind commit(s))" }
            $pushStatus = if ($ahead -eq 0) { "OK" } else { "NEEDED ($ahead commit(s))" }
        }
    }
    $mergeStatus = "UNKNOWN"; $prUrl = $null
    if ($branchName -eq "main") { $mergeStatus = "N/A (current branch is main)" }
    elseif ($branchName -eq "(detached HEAD)") { $mergeStatus = "UNKNOWN (detached HEAD)" }
    else {
        & git show-ref --verify --quiet "refs/remotes/origin/main"
        if ($LASTEXITCODE -ne 0) { $mergeStatus = "UNKNOWN (origin/main not found)" }
        else {
            & git merge-base --is-ancestor HEAD origin/main 2>$null
            if ($LASTEXITCODE -eq 0) { $mergeStatus = "MERGED" }
            else {
                $gh = Get-Command gh -ErrorAction SilentlyContinue
                if ($gh) {
                    $prJson = & gh pr view $branchName --json state,mergedAt,url 2>$null
                    if ($LASTEXITCODE -eq 0 -and $prJson) {
                        try {
                            $pr = $prJson | ConvertFrom-Json; $prUrl = $pr.url
                            if ($pr.mergedAt) { $mergeStatus = "MERGED (PR)" }
                            elseif ($pr.state -eq "OPEN") { $mergeStatus = "OPEN PR" }
                            elseif ($pr.state -eq "CLOSED") { $mergeStatus = "CLOSED PR (not merged)" }
                        } catch {}
                    }
                }
                if ($mergeStatus -eq "UNKNOWN") {
                    $cherry = @(& git cherry origin/main HEAD 2>$null)
                    if ($LASTEXITCODE -eq 0) {
                        $positive = @($cherry | Where-Object { $_ -match '^\+' }); $negative = @($cherry | Where-Object { $_ -match '^-' })
                        if ($positive.Count -gt 0) { $mergeStatus = "NOT MERGED ($($positive.Count) unique commit(s))" }
                        elseif ($negative.Count -gt 0) { $mergeStatus = "LIKELY MERGED (equivalent patch in main)" }
                        else { $mergeStatus = "NO UNIQUE COMMITS" }
                    }
                }
            }
        }
    }
    Write-Host ""; Write-Host "=== Git Sync Status ==="
    Write-Host ("Repository      : {0}" -f $repo)
    Write-Host ("Branch          : {0}" -f $branchName)
    Write-Host ("Working tree    : {0}" -f $workingTree)
    Write-Host ("Fetch origin    : {0}" -f $fetchStatus)
    Write-Host ("Tracking branch : {0}" -f $(if ($upstream) { $upstream } else { "(none)" }))
    Write-Host ("Pull            : {0}" -f $pullStatus)
    Write-Host ("Push            : {0}" -f $pushStatus)
    Write-Host ("Merge to main   : {0}" -f $mergeStatus)
    if ($prUrl) { Write-Host ("PR              : {0}" -f $prUrl) }
    Write-Host ""
} finally { Pop-Location }
