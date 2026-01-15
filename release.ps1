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
$packageJson = Get-Content -Raw -Path 'package.json' | ConvertFrom-Json
$version = $packageJson.version

# Check if the version already exists as a tag
$existingTags = git tag
if ($existingTags -contains $version) {
    Write-Host "Version $version already released. Bumping patch version..." -ForegroundColor Yellow
    # Create a patch version using npm (updates package.json)
    $newVersion = (npm version patch --no-git-tag-version).TrimStart('v')
} else {
    $newVersion = $version
}

# Sync manifest.json and versions.json using the version-bump script
# This ensures manifest.json and versions.json are in sync with package.json
Write-Host "Syncing version files..." -ForegroundColor Yellow
$env:npm_package_version = $newVersion
node version-bump.mjs

# Commit changes
if (-not $DryRun) {
    git add package.json manifest.json versions.json
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