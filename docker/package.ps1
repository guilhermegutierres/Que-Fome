param([Parameter(Mandatory = $true)][string]$Destination)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$zipPath = [IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $zipPath) { throw 'O ZIP de destino já existe; escolha outro nome para preservar a cópia anterior.' }
foreach ($required in @('compose.yaml', '.env.docker', 'docker/local-data/que-fome.dump', 'docker/secrets/db_admin_password.txt', 'docker/secrets/db_app_password.txt')) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $required))) { throw "Arquivo necessário ausente: $required. Execute npm run docker:prepare antes." }
}
$temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$stage = [IO.Path]::GetFullPath((Join-Path $temporaryRoot ('que-fome-package-' + [Guid]::NewGuid().ToString('N'))))
if (-not $stage.StartsWith($temporaryRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Destino temporário inválido.' }
$packageRoot = Join-Path $stage 'Que-Fome'
New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
function Copy-ProjectDirectory([string]$Source, [string]$Target) {
    foreach ($item in Get-ChildItem -LiteralPath $Source -Force) {
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Link não permitido no pacote: $($item.Name)" }
        if ($item.PSIsContainer) {
            if ($item.Name -in @('node_modules', 'dist', '.git', '.vscode', 'work', 'outputs')) { continue }
            $folder = Join-Path $Target $item.Name
            New-Item -ItemType Directory -Path $folder -Force | Out-Null
            Copy-ProjectDirectory $item.FullName $folder
        } else {
            if ($item.Name -like '.env*' -and $item.Name -notin @('.env.example', '.env.docker')) { continue }
            if ($item.Extension -in @('.zip', '.log', '.exe', '.partial')) { continue }
            if ($item.Name -like '*.tsbuildinfo') { continue }
            Copy-Item -LiteralPath $item.FullName -Destination (Join-Path $Target $item.Name)
        }
    }
}
try {
    Copy-ProjectDirectory $projectRoot $packageRoot
    Compress-Archive -LiteralPath $packageRoot -DestinationPath $zipPath -CompressionLevel Optimal
    Write-Output "Pacote criado: $zipPath"
    Write-Output 'Contém o banco e as credenciais exclusivas do Docker. Transporte de forma privada; não publique no GitHub.'
} finally {
    # Remove somente o diretório temporário recém-criado, após validar seu caminho.
    $resolvedStage = [IO.Path]::GetFullPath($stage)
    if ($resolvedStage.StartsWith($temporaryRoot, [StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path $resolvedStage -Leaf) -like 'que-fome-package-*') {
        Remove-Item -LiteralPath $resolvedStage -Recurse -Force
    }
}
