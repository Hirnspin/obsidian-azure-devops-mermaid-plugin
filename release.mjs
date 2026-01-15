/* global process */
import { execSync, spawnSync } from 'child_process';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

function log(message, color = 'white') {
	const colors = {
		red: '\x1b[31m',
		yellow: '\x1b[33m',
		green: '\x1b[32m',
		white: '\x1b[37m',
		reset: '\x1b[0m'
	};
	console.log(`${colors[color]}${message}${colors.reset}`);
}

try {
	// Check if git working directory is clean
	const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
	if (gitStatus) {
		log('Error: Git working directory is not clean. Please commit or stash your changes.', 'red');
		process.exit(1);
	}

	// Get the current version from package.json
	const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
	const currentVersion = packageJson.version;

	// Check if the version already exists as a tag
	const existingTags = execSync('git tag', { encoding: 'utf-8' }).trim().split('\n');
	let newVersion = currentVersion;

	if (existingTags.includes(currentVersion)) {
		log(`Version ${currentVersion} already released. Bumping patch version...`, 'yellow');
		// npm version patch --no-git-tag-version will:
		// 1. Update package.json version
		// 2. Trigger preversion hook (check + lint)
		// 3. Trigger version hook (version-bump.mjs)
		const result = spawnSync('npm', ['version', 'patch', '--no-git-tag-version'], {
			stdio: 'inherit',
			shell: true
		});
		if (result.status !== 0) {
			log('Error: Failed to bump version', 'red');
			process.exit(1);
		}
		// Re-read package.json to get the new version
		const updatedPackageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
		newVersion = updatedPackageJson.version;
	} else {
		log(`Releasing version ${newVersion}...`, 'yellow');
		// Still need to run version hook to sync manifest.json and versions.json
		process.env.npm_package_version = newVersion;
		const result = spawnSync('node', ['version-bump.mjs'], {
			stdio: 'inherit',
			shell: true
		});
		if (result.status !== 0) {
			log('Error: Failed to sync version files', 'red');
			process.exit(1);
		}
	}

	// Commit changes
	if (!dryRun) {
		execSync('git add package.json manifest.json versions.json', { stdio: 'inherit' });
		execSync(`git commit -m "Release version ${newVersion}"`, { stdio: 'inherit' });

		// Create and push git tag
		execSync(`git tag -a ${newVersion} -m "${newVersion}"`, { stdio: 'inherit' });
		execSync(`git push origin ${newVersion}`, { stdio: 'inherit' });

		log(`Release version ${newVersion} completed successfully.`, 'green');
	} else {
		log('Dry run mode: The following changes would be made:', 'yellow');
		log(`- Version updated to: ${newVersion}`, 'yellow');
		log(`- Would commit: Release version ${newVersion}`, 'yellow');
		log(`- Would create tag: ${newVersion}`, 'yellow');
		log(`- Would push tag to origin`, 'yellow');
	}
} catch (error) {
	log(`Error: ${error.message}`, 'red');
	process.exit(1);
}


