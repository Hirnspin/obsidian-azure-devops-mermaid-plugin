# PowerShell script to release the plugin

# Get the current version from package.json
$packageJson = Get-Content -Raw -Path 'c:\repos\obsidian-azure-devops-mermaid-plugin\package.json' | ConvertFrom-Json
$version = $packageJson.version

# Check if the version already exists as a tag
$existingTags = git tag
if ($existingTags -contains $version) {
    # Create a patch version
    $newVersion = npm version patch
    # Update the version in package.json
    $packageJson.version = $newVersion
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path 'c:\repos\obsidian-azure-devops-mermaid-plugin\package.json'
} else {
    $newVersion = $version
}

# Release script
npm version $newVersion

# Update the version in manifest.json
$manifestJsonPath = 'c:\repos\obsidian-azure-devops-mermaid-plugin\manifest.json'
$manifestJson = Get-Content -Raw -Path $manifestJsonPath | ConvertFrom-Json
$manifestJson.version = $newVersion
$manifestJson | ConvertTo-Json -Depth 10 | Set-Content -Path $manifestJsonPath

# Commit changes
git add .
git commit -m "Release version $newVersion"

# Create and push git tag
git tag -a $newVersion -m "$newVersion"
git push origin $newVersion