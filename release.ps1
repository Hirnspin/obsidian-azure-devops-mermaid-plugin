# PowerShell script to release the plugin

param(
    [switch]$DryRun = $false
)

# Check if git working directory is clean
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "Error: Git working directory is not clean. Please commit or stash your changes." -ForegroundColor Red
    exit 1
}

# Get the current version from package.json
$packageJson = Get-Content -Raw -Path 'c:\repos\obsidian-azure-devops-mermaid-plugin\package.json' | ConvertFrom-Json
$version = $packageJson.version

# Check if the version already exists as a tag
$existingTags = git tag
if ($existingTags -contains $version) {
    # Create a patch version
    $newVersion = (npm version patch --no-git-tag-version).TrimStart('v')
    # Re-read the updated package.json
    $packageJson = Get-Content -Raw -Path 'c:\repos\obsidian-azure-devops-mermaid-plugin\package.json' | ConvertFrom-Json
} else {
    $newVersion = $version
}

# Update the version in manifest.json
$manifestJsonPath = 'c:\repos\obsidian-azure-devops-mermaid-plugin\manifest.json'
$manifestJson = Get-Content -Raw -Path $manifestJsonPath | ConvertFrom-Json
$manifestJson.version = $newVersion
$manifestJson | ConvertTo-Json -Depth 10 | Set-Content -Path $manifestJsonPath

# Commit changes
if (-not $DryRun) {
    git add .
    git commit -m "Release version $newVersion"

    # Create and push git tag
    git tag -a $newVersion -m "$newVersion"
    git push origin $newVersion
    Write-Host "Release version $newVersion completed successfully." -ForegroundColor Green
} else {
    Write-Host "Dry run mode: The following changes would be made:" -ForegroundColor Yellow
    Write-Host "- Version updated to: $newVersion" -ForegroundColor Yellow
    Write-Host "- Would commit: Release version $newVersion" -ForegroundColor Yellow
    Write-Host "- Would create tag: $newVersion" -ForegroundColor Yellow
    Write-Host "- Would push tag to origin" -ForegroundColor Yellow
}