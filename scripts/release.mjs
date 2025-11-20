#!/usr/bin/env node

/**
 * 自动发布脚本 (跨平台)
 * 使用方法: pnpm release 0.3.8
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 颜色输出
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
    try {
        return execSync(command, {
            cwd: rootDir,
            encoding: 'utf8',
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options
        });
    } catch (error) {
        if (!options.ignoreError) {
            throw error;
        }
        return null;
    }
}

async function main() {
    const newVersion = process.argv[2];

    if (!newVersion) {
        log('❌ 错误: 请提供版本号', 'red');
        log('使用方法: pnpm release [版本号]', 'yellow');
        log('例如: pnpm release 0.3.8', 'yellow');
        process.exit(1);
    }

    const tagName = `v${newVersion}`;

    log('========== 开始发布流程 ==========', 'green');
    log(`新版本: ${newVersion}`, 'yellow');
    console.log();

    // 1. 检查工作区是否干净
    log('[1/7] 检查工作区状态...', 'yellow');
    const status = exec('git status --porcelain', { silent: true });
    if (status && status.trim()) {
        log('❌ 工作区有未提交的更改，请先提交或储藏', 'red');
        exec('git status --short');
        process.exit(1);
    }
    log('✓ 工作区干净', 'green');
    console.log();

    // 2. 检查 tag 是否已存在
    log('[2/7] 检查 tag 是否存在...', 'yellow');
    const tagExists = exec(`git rev-parse ${tagName}`, { silent: true, ignoreError: true });
    if (tagExists) {
        log(`❌ 错误: tag ${tagName} 已存在`, 'red');
        log('如果要重新发布，请先删除旧 tag：', 'yellow');
        log(`  git tag -d ${tagName}`, 'yellow');
        log(`  git push origin :refs/tags/${tagName}`, 'yellow');
        process.exit(1);
    }
    log('✓ tag 不存在，可以创建', 'green');
    console.log();

    // 3. 更新版本号
    log('[3/7] 更新版本号...', 'yellow');

    // 更新 package.json
    const packageJsonPath = join(rootDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = newVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n');

    // 更新 tauri.conf.json
    const tauriConfPath = join(rootDir, 'src-tauri', 'tauri.conf.json');
    const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));
    tauriConf.version = newVersion;
    writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, '\t') + '\n');

    // 更新 Cargo.toml
    const cargoTomlPath = join(rootDir, 'src-tauri', 'Cargo.toml');
    let cargoToml = readFileSync(cargoTomlPath, 'utf8');
    cargoToml = cargoToml.replace(/^version = ".*"$/m, `version = "${newVersion}"`);
    writeFileSync(cargoTomlPath, cargoToml);

    log('✓ 版本号已更新', 'green');
    console.log();

    // 4. 提交版本更新
    log('[4/7] 提交版本更新...', 'yellow');
    exec('git add package.json pnpm-lock.yaml src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json');
    exec(`git commit -m "chore: bump version to ${newVersion}"`, { ignoreError: true });
    log('✓ 版本已提交', 'green');
    console.log();

    // 5. 创建 tag
    log('[5/7] 创建 tag...', 'yellow');
    exec(`git tag -a ${tagName} -m "Release version ${newVersion}"`);
    log(`✓ tag ${tagName} 已创建`, 'green');
    console.log();

    // 6. 推送到远程
    log('[6/7] 推送到远程仓库...', 'yellow');
    log('推送主分支...', 'yellow');
    exec('git push origin main');
    log('推送 tag...', 'yellow');
    exec(`git push origin ${tagName}`);
    log('✓ 已推送到远程', 'green');
    console.log();

    // 7. 完成
    log('========== 发布流程完成! ==========', 'green');
    console.log();
    log('接下来的步骤:', 'yellow');
    console.log('1. GitHub Actions 将自动构建并创建 release');
    console.log('2. 构建完成后，latest.json 将在以下地址可用:');
    console.log('   https://github.com/liuaibin001/tvcbuddy/releases/latest/download/latest.json');
    console.log('3. 检查 GitHub Actions 状态: https://github.com/liuaibin001/tvcbuddy/actions');
    console.log();
    log('🎉 发布成功!', 'green');
}

main().catch(error => {
    log(`❌ 发布失败: ${error.message}`, 'red');
    process.exit(1);
});
