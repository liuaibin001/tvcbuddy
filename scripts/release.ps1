# 自动发布脚本 (Windows PowerShell)
# 使用方法: .\scripts\release.ps1 -Version 0.3.8

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

# 颜色函数
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Yellow }
function Write-Fail { Write-Host $args -ForegroundColor Red }

$TagName = "v$Version"

Write-Success "========== 开始发布流程 =========="
Write-Info "新版本: $Version"
Write-Host ""

# 1. 检查工作区是否干净
Write-Info "[1/7] 检查工作区状态..."
$status = git status --porcelain
if ($status) {
    Write-Fail "工作区有未提交的更改，请先提交或储藏"
    git status --short
    exit 1
}
Write-Success "✓ 工作区干净"
Write-Host ""

# 2. 检查 tag 是否已存在
Write-Info "[2/7] 检查 tag 是否存在..."
$tagExists = git rev-parse $TagName 2>$null
if ($tagExists) {
    Write-Fail "错误: tag $TagName 已存在"
    Write-Host "如果要重新发布，请先删除旧 tag："
    Write-Host "  git tag -d $TagName"
    Write-Host "  git push origin :refs/tags/$TagName"
    exit 1
}
Write-Success "✓ tag 不存在，可以创建"
Write-Host ""

# 3. 更新版本号
Write-Info "[3/7] 更新版本号..."
npm version $Version --no-git-tag-version
Write-Success "✓ 版本号已更新"
Write-Host ""

# 4. 提交版本更新
Write-Info "[4/7] 提交版本更新..."
git add package.json package-lock.json pnpm-lock.yaml src-tauri/Cargo.lock src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to $Version"
Write-Success "✓ 版本已提交"
Write-Host ""

# 5. 创建 tag
Write-Info "[5/7] 创建 tag..."
git tag -a $TagName -m "Release version $Version"
Write-Success "✓ tag $TagName 已创建"
Write-Host ""

# 6. 推送到远程
Write-Info "[6/7] 推送到远程仓库..."
Write-Host "推送主分支..."
git push origin main

Write-Host "推送 tag..."
git push origin $TagName
Write-Success "✓ 已推送到远程"
Write-Host ""

# 7. 完成
Write-Success "========== 发布流程完成! =========="
Write-Host ""
Write-Info "接下来的步骤:"
Write-Host "1. GitHub Actions 将自动构建并创建 release"
Write-Host "2. 构建完成后，latest.json 将在以下地址可用:"
Write-Host "   https://github.com/liuaibin001/tvcbuddy/releases/latest/download/latest.json"
Write-Host "3. 检查 GitHub Actions 状态: https://github.com/liuaibin001/tvcbuddy/actions"
Write-Host ""
Write-Success "🎉 发布成功!"
