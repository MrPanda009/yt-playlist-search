// zero-dependency script to package YouTube Playlist Search for Chrome (.zip) and Firefox (.xpi)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const chromeDir = path.join(distDir, 'chrome');
const firefoxDir = path.join(distDir, 'firefox');

// List of core files to copy directly
const coreFiles = [
  'background.js',
  'content.js',
  'style.css',
  'options.html',
  'options.css',
  'options.js'
];

function cleanAndCreateDirs() {
  console.log('🧹 Cleaning and creating dist/ directories...');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(chromeDir, { recursive: true });
  fs.mkdirSync(firefoxDir, { recursive: true });
}

function copyFiles(targetDir) {
  console.log(`📦 Copying files to ${path.relative(rootDir, targetDir)}...`);
  
  // Copy core files
  coreFiles.forEach(file => {
    const srcPath = path.join(rootDir, file);
    const destPath = path.join(targetDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    } else {
      console.warn(`⚠️ Warning: Core file ${file} not found.`);
    }
  });

  // Copy icons folder (excluding system files like .DS_Store)
  const srcIconsDir = path.join(rootDir, 'icons');
  const destIconsDir = path.join(targetDir, 'icons');
  if (fs.existsSync(srcIconsDir)) {
    fs.mkdirSync(destIconsDir, { recursive: true });
    const iconFiles = fs.readdirSync(srcIconsDir);
    iconFiles.forEach(file => {
      if (file === '.DS_Store') return;
      fs.copyFileSync(path.join(srcIconsDir, file), path.join(destIconsDir, file));
    });
  } else {
    console.warn('⚠️ Warning: icons folder not found.');
  }
}

function buildChromeManifest() {
  console.log('🔧 Building Google Chrome manifest...');
  const manifestPath = path.join(rootDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found in root directory!');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Configure Chrome MV3 background (Service Worker ONLY, no background scripts array)
  manifest.background = {
    service_worker: 'background.js'
  };

  // Remove Firefox-specific gecko id settings
  delete manifest.browser_specific_settings;

  fs.writeFileSync(
    path.join(chromeDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
}

function buildFirefoxManifest() {
  console.log('🔧 Building Mozilla Firefox manifest...');
  const manifestPath = path.join(rootDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found in root directory!');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Configure Firefox MV3 background (Event Script array, no service worker)
  manifest.background = {
    scripts: ['background.js']
  };

  // Ensure browser specific settings are present
  if (!manifest.browser_specific_settings) {
    manifest.browser_specific_settings = {
      gecko: {
        id: 'yt-playlist-search@mrpanda009.github.io'
      }
    };
  }

  fs.writeFileSync(
    path.join(firefoxDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
}

function zipDirectory(sourceDir, outZipName) {
  const absoluteOutPath = path.join(distDir, outZipName);
  console.log(`🤐 Compressing ${path.basename(sourceDir)} into ${outZipName}...`);
  
  try {
    // Run standard zip command. Cwd is set to sourceDir so files are zipped at the root level of the archive.
    execSync(`zip -q -r "${absoluteOutPath}" .`, {
      cwd: sourceDir,
      stdio: 'inherit'
    });
    console.log(`✅ Successfully generated: ${absoluteOutPath}`);
  } catch (error) {
    console.error(`❌ Failed to zip directory using system command: ${error.message}`);
    console.error('Make sure you have the "zip" command-line utility installed on your system (standard on macOS & Linux).');
    process.exit(1);
  }
}

function main() {
  try {
    cleanAndCreateDirs();
    
    // Copy files & manifest to Chrome
    copyFiles(chromeDir);
    buildChromeManifest();
    zipDirectory(chromeDir, 'yt-playlist-search-chrome.zip');
    
    // Copy files & manifest to Firefox
    copyFiles(firefoxDir);
    buildFirefoxManifest();
    zipDirectory(firefoxDir, 'yt-playlist-search-firefox.xpi');
    
    console.log('\n🎉 Extension packaging complete!');
    console.log(`📁 Target packages generated inside: ${path.relative(rootDir, distDir)}/`);
    console.log('   📦 Chrome:  yt-playlist-search-chrome.zip');
    console.log('   📦 Firefox: yt-playlist-search-firefox.xpi');
  } catch (error) {
    console.error(`❌ Packaging error: ${error.message}`);
    process.exit(1);
  }
}

main();
