#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting ViperX Team Manager...\n');

// Check if .env file exists
function checkEnvFile() {
    const envPath = path.join(__dirname, '../apps/backend/.env');
    if (!fs.existsSync(envPath)) {
        console.log('⚠️  Warning: backend/.env file not found');
        console.log('💡 Copy apps/backend/.env.example to apps/backend/.env and configure DATABASE_URL for PostgreSQL\n');
        return false;
    }
    return true;
}

function runCommand(label, command, args, options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`${label} ${command} ${args.join(' ')}\n`);
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            ...options
        });

        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`${command} exited with code ${code}`));
            }
        });
    });
}

async function preparePrisma() {
    const backendDir = path.join(__dirname, '../apps/backend');

    try {
        await runCommand('🧬 Generating Prisma client →', 'npm', ['run', 'prisma:generate'], { cwd: backendDir });
    } catch (error) {
        console.error('❌ Failed to generate Prisma client.', error.message);
        console.log('   Ensure DATABASE_URL is configured in apps/backend/.env and run npm run prisma:generate manually.\n');
    }

    try {
        await runCommand('🧱 Applying Prisma migrations →', 'npm', ['run', 'prisma:migrate'], { cwd: backendDir });
    } catch (error) {
        console.error('⚠️  Prisma migrations did not run.', error.message);
        console.log('   Check that PostgreSQL is running and credentials are correct.');
        console.log('   Continuing without applying migrations. Run npm run prisma:migrate once the database is ready.\n');
    }
}

function startBackend() {
    console.log('🔵 Starting Backend API on port 5000...');
    const backend = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '../apps/backend'),
        stdio: 'inherit',
        shell: true
    });

    backend.on('error', (error) => {
        console.error('❌ Backend error:', error);
    });

    return backend;
}

function startFrontend() {
    console.log('🟢 Starting Frontend on port 5173...\n');
    const frontend = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '../apps/frontend'),
        stdio: 'inherit',
        shell: true
    });

    frontend.on('error', (error) => {
        console.error('❌ Frontend error:', error);
    });

    return frontend;
}

async function main() {
    if (!checkEnvFile()) {
        console.log('⚠️  Please set up backend/.env before starting\n');
    }

    await preparePrisma();

    const backend = startBackend();

    await new Promise(resolve => setTimeout(resolve, 3000));

    const frontend = startFrontend();

    const cleanup = () => {
      console.log('\n\n🛑 Stopping all services...');
        backend.kill('SIGTERM');
        frontend.kill('SIGTERM');
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}

main();
