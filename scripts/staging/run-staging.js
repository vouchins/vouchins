const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const workspaceRoot = path.join(__dirname, '../..');
const envLocalPath = path.join(workspaceRoot, '.env.local');
const envStagingPath = path.join(workspaceRoot, '.env.staging');
const envBackupPath = path.join(workspaceRoot, '.env.local.backup');

let backupCreated = false;

// Safety check: if a backup already exists, it means a previous session crashed/was killed
// Restore it first so we don't overwrite the original local environment with staging keys!
if (fs.existsSync(envBackupPath)) {
  console.warn('⚠️ Warning: Found an existing .env.local.backup from a previous run.');
  console.log('Restoring your original .env.local to prevent data loss...');
  try {
    if (fs.existsSync(envLocalPath)) {
      fs.unlinkSync(envLocalPath);
    }
    fs.renameSync(envBackupPath, envLocalPath);
    console.log('✓ Original .env.local restored successfully.');
  } catch (err) {
    console.error('✗ Failed to restore existing backup:', err.message);
  }
}

// 1. Back up existing .env.local
if (fs.existsSync(envLocalPath)) {
  console.log('Backing up existing .env.local...');
  fs.copyFileSync(envLocalPath, envBackupPath);
  backupCreated = true;
}

// 2. Copy .env.staging to .env.local
if (fs.existsSync(envStagingPath)) {
  console.log('Loading staging environment variables...');
  fs.copyFileSync(envStagingPath, envLocalPath);
} else {
  console.error('Error: .env.staging file not found!');
  restoreAndExit(1);
}

// 3. Start Next.js development server
console.log('Starting Next.js in staging mode...');
const nextDev = spawn('npx', ['next', 'dev'], {
  cwd: workspaceRoot,
  stdio: 'inherit',
  shell: true
});

// Handle termination signals to ensure cleanup is run
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Cleaning up...');
  restoreAndExit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Cleaning up...');
  restoreAndExit(0);
});

process.on('uncaughtException', (err) => {
  console.error('\nUncaught Exception in runner. Cleaning up...', err);
  restoreAndExit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\nUnhandled Rejection in runner. Cleaning up...', reason);
  restoreAndExit(1);
});

nextDev.on('close', (code) => {
  console.log(`Next.js dev server exited with code ${code}. Cleaning up...`);
  restoreAndExit(code);
});

function restoreAndExit(exitCode) {
  try {
    if (fs.existsSync(envLocalPath)) {
      fs.unlinkSync(envLocalPath);
    }
    if (backupCreated && fs.existsSync(envBackupPath)) {
      console.log('Restoring original .env.local...');
      fs.renameSync(envBackupPath, envLocalPath);
    }
    console.log('Cleanup completed.');
  } catch (err) {
    console.error('Error during cleanup:', err.message);
  }
  process.exit(exitCode);
}
