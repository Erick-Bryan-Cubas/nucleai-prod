param(
    [switch]$OnlyCheck,
    [switch]$UseLatestTags
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$dockerDir = Resolve-Path $scriptDir
$envFilePath = Join-Path $dockerDir ".env"
$uiPublicDir = Join-Path $repoRoot "wren-ui\public"
$tempBackupDir = Join-Path $env:TEMP ("wren-ui-public-backup-" + [guid]::NewGuid().ToString("N"))

function Get-EnvMap {
    param([string]$Path)

    $map = @{}
    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }

        $pair = $trimmed -split "=", 2
        if ($pair.Count -eq 2) {
            $map[$pair[0].Trim()] = $pair[1].Trim()
        }
    }

    return $map
}

function Get-ImageDigest {
    param([string]$ImageRef)

    $inspect = docker buildx imagetools inspect $ImageRef 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $inspect) {
        return $null
    }

    foreach ($line in $inspect) {
        if ($line -match "^Digest:\s+(sha256:[a-f0-9]+)") {
            return $Matches[1]
        }
    }

    return $null
}

function Set-EnvValue {
    param(
        [string]$Path,
        [string]$Key,
        [string]$Value
    )

    $lines = Get-Content $Path
    $updated = $false

    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s*${Key}=") {
            $lines[$i] = "${Key}=${Value}"
            $updated = $true
            break
        }
    }

    if (-not $updated) {
        $lines += "${Key}=${Value}"
    }

    Set-Content -Path $Path -Value $lines -Encoding UTF8
}

function Test-VersionStatus {
    param(
        [string]$Name,
        [string]$Image,
        [string]$CurrentTag
    )

    if (-not $CurrentTag) {
        return [PSCustomObject]@{
            Service = $Name
            CurrentTag = "(nao definido)"
            RepoRef = "N/A"
            Status = "desconhecido"
            NeedsUpdate = "unknown"
        }
    }

    $currentRef = "$Image`:$CurrentTag"
    $currentDigest = Get-ImageDigest -ImageRef $currentRef

    $latestRef = "$Image`:latest"
    $latestDigest = Get-ImageDigest -ImageRef $latestRef

    if (-not $currentDigest) {
        return [PSCustomObject]@{
            Service = $Name
            CurrentTag = $CurrentTag
            RepoRef = $latestRef
            Status = "tag atual nao encontrada"
            NeedsUpdate = "unknown"
        }
    }

    if (-not $latestDigest) {
        return [PSCustomObject]@{
            Service = $Name
            CurrentTag = $CurrentTag
            RepoRef = $latestRef
            Status = "latest indisponivel"
            NeedsUpdate = "unknown"
        }
    }

    if ($currentDigest -eq $latestDigest) {
        return [PSCustomObject]@{
            Service = $Name
            CurrentTag = $CurrentTag
            RepoRef = $latestRef
            Status = "atual"
            NeedsUpdate = "no"
        }
    }

    return [PSCustomObject]@{
        Service = $Name
        CurrentTag = $CurrentTag
        RepoRef = $latestRef
        Status = "nova imagem disponivel"
        NeedsUpdate = "yes"
    }
}

if ($OnlyCheck -and $UseLatestTags) {
    throw "Use apenas um modo por vez: -OnlyCheck ou -UseLatestTags."
}

$envMap = Get-EnvMap -Path $envFilePath

$versionTargets = @(
    @{ Name = "bootstrap"; Image = "ghcr.io/canner/wren-bootstrap"; Tag = $envMap["WREN_BOOTSTRAP_VERSION"] },
    @{ Name = "wren-engine"; Image = "ghcr.io/canner/wren-engine"; Tag = $envMap["WREN_ENGINE_VERSION"] },
    @{ Name = "ibis-server"; Image = "ghcr.io/canner/wren-engine-ibis"; Tag = $envMap["IBIS_SERVER_VERSION"] },
    @{ Name = "wren-ai-service"; Image = "ghcr.io/canner/wren-ai-service"; Tag = $envMap["WREN_AI_SERVICE_VERSION"] },
    @{ Name = "qdrant"; Image = "qdrant/qdrant"; Tag = $envMap["QDRANT_VERSION"] }
)

Write-Host "[0/6] Verificando versao atual x repositorio..."
$versionReport = foreach ($item in $versionTargets) {
    Test-VersionStatus -Name $item.Name -Image $item.Image -CurrentTag $item.Tag
}
$versionReport | Format-Table -AutoSize

if ($OnlyCheck) {
    Write-Host "Modo somente verificacao concluido."
    exit 0
}

if ($UseLatestTags) {
    Write-Host "[0.1/6] Aplicando latest nas variaveis de versao com update disponivel..."

    $keyByService = @{
        "bootstrap" = "WREN_BOOTSTRAP_VERSION"
        "wren-engine" = "WREN_ENGINE_VERSION"
        "ibis-server" = "IBIS_SERVER_VERSION"
        "wren-ai-service" = "WREN_AI_SERVICE_VERSION"
        "qdrant" = "QDRANT_VERSION"
    }

    Copy-Item -Path $envFilePath -Destination "$envFilePath.bak" -Force

    foreach ($row in $versionReport) {
        if ($row.NeedsUpdate -eq "yes") {
            $key = $keyByService[$row.Service]
            if ($key) {
                Set-EnvValue -Path $envFilePath -Key $key -Value "latest"
                Write-Host "  - $key => latest"
            }
        }
    }

    $envMap = Get-EnvMap -Path $envFilePath
}

Write-Host "[1/6] Preservando wren-ui/public..."
New-Item -ItemType Directory -Path $tempBackupDir | Out-Null
if (Test-Path $uiPublicDir) {
    $publicItems = Get-ChildItem -Path $uiPublicDir -Force
    if ($publicItems) {
        Copy-Item -Path (Join-Path $uiPublicDir "*") -Destination $tempBackupDir -Recurse -Force
    }
}

Push-Location $dockerDir
$updateError = $null
try {
    Write-Host "[2/6] Atualizando imagens das engines e servicos base..."
    docker compose --env-file .env pull bootstrap wren-engine ibis-server wren-ai-service qdrant

    Write-Host "[3/6] Rebuild do wren-ui com base atualizada (sem alterar public)..."
    docker compose --env-file .env build --pull wren-ui

    Write-Host "[4/6] Recriando stack..."
    docker compose --env-file .env up -d
}
catch {
    $updateError = $_
}
finally {
    Pop-Location

    Write-Host "[5/6] Restaurando wren-ui/public para garantir preservacao da logo..."
    if (-not (Test-Path $uiPublicDir)) {
        New-Item -ItemType Directory -Path $uiPublicDir | Out-Null
    }
    Get-ChildItem -Path $uiPublicDir -Force | Remove-Item -Recurse -Force

    $backupItems = Get-ChildItem -Path $tempBackupDir -Force
    if ($backupItems) {
        Copy-Item -Path (Join-Path $tempBackupDir "*") -Destination $uiPublicDir -Recurse -Force
    }

    if (Test-Path $tempBackupDir) {
        Remove-Item -Path $tempBackupDir -Recurse -Force
    }
}

if ($updateError) {
    throw $updateError
}

Write-Host "Concluido. Estado atual dos containers:"
Push-Location $dockerDir
try {
    docker compose ps

    Write-Host "[6/6] Limpando imagens Docker nao utilizadas..."
    docker image prune -a -f
}
finally {
    Pop-Location
}
