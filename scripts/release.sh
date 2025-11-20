#!/bin/bash

# 自动发布脚本
# 使用方法: ./scripts/release.sh [版本号]
# 例如: ./scripts/release.sh 0.3.8

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查参数
if [ -z "$1" ]; then
    echo -e "${RED}错误: 请提供版本号${NC}"
    echo "使用方法: ./scripts/release.sh [版本号]"
    echo "例如: ./scripts/release.sh 0.3.8"
    exit 1
fi

NEW_VERSION=$1
TAG_NAME="v${NEW_VERSION}"

echo -e "${GREEN}========== 开始发布流程 ==========${NC}"
echo -e "${YELLOW}新版本: ${NEW_VERSION}${NC}"
echo ""

# 1. 检查工作区是否干净
echo -e "${YELLOW}[1/7] 检查工作区状态...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}工作区有未提交的更改，请先提交或储藏${NC}"
    git status --short
    exit 1
fi
echo -e "${GREEN}✓ 工作区干净${NC}"
echo ""

# 2. 检查 tag 是否已存在
echo -e "${YELLOW}[2/7] 检查 tag 是否存在...${NC}"
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
    echo -e "${RED}错误: tag ${TAG_NAME} 已存在${NC}"
    echo "如果要重新发布，请先删除旧 tag："
    echo "  git tag -d ${TAG_NAME}"
    echo "  git push origin :refs/tags/${TAG_NAME}"
    exit 1
fi
echo -e "${GREEN}✓ tag 不存在，可以创建${NC}"
echo ""

# 3. 更新版本号
echo -e "${YELLOW}[3/7] 更新版本号...${NC}"
# 更新 package.json
npm version $NEW_VERSION --no-git-tag-version
# 更新 tauri.conf.json
cd src-tauri
cargo build --release > /dev/null 2>&1 || true
cd ..
echo -e "${GREEN}✓ 版本号已更新${NC}"
echo ""

# 4. 提交版本更新
echo -e "${YELLOW}[4/7] 提交版本更新...${NC}"
git add package.json package-lock.json src-tauri/Cargo.lock src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to ${NEW_VERSION}" || echo "没有需要提交的更改"
echo -e "${GREEN}✓ 版本已提交${NC}"
echo ""

# 5. 创建并推送 tag
echo -e "${YELLOW}[5/7] 创建 tag...${NC}"
git tag -a "$TAG_NAME" -m "Release version ${NEW_VERSION}"
echo -e "${GREEN}✓ tag ${TAG_NAME} 已创建${NC}"
echo ""

# 6. 推送到远程
echo -e "${YELLOW}[6/7] 推送到远程仓库...${NC}"
git push origin main
git push origin "$TAG_NAME"
echo -e "${GREEN}✓ 已推送到远程${NC}"
echo ""

# 7. 完成
echo -e "${GREEN}========== 发布流程完成! ==========${NC}"
echo ""
echo -e "${YELLOW}接下来的步骤:${NC}"
echo "1. GitHub Actions 将自动构建并创建 release"
echo "2. 构建完成后，latest.json 将在以下地址可用:"
echo "   https://github.com/liuaibin001/tvcbuddy/releases/latest/download/latest.json"
echo "3. 检查 GitHub Actions 状态: https://github.com/liuaibin001/tvcbuddy/actions"
echo ""
echo -e "${GREEN}🎉 发布成功!${NC}"
