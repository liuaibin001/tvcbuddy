# 📚 项目命令参考 - TVCBuddy (CC Mate)

完整的开发、测试、构建和发布命令指南。

---

## 📋 目录

- [环境要求](#环境要求)
- [开发命令](#开发命令)
- [构建命令](#构建命令)
- [代码质量检查](#代码质量检查)
- [发布流程](#发布流程)
- [Rust 后端命令](#rust-后端命令)
- [Git 操作](#git-操作)
- [常见问题](#常见问题)

---

## 🔧 环境要求

### 必需工具

- **Node.js**: v18+
- **pnpm**: v8+ (包管理器)
- **Rust**: 最新稳定版
- **Tauri CLI**: v2+

### 安装依赖

```bash
# 安装 pnpm（如果尚未安装）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

---

## 🚀 开发命令

### 启动开发服务器

```bash
# 启动 Tauri 桌面应用开发模式（推荐）
pnpm tauri dev

# 仅启动前端 Vite 开发服务器
pnpm dev
```

**说明**：
- `pnpm tauri dev` - 同时启动前端和 Rust 后端，热重载支持
- `pnpm dev` - 仅前端开发，不包含 Tauri 功能
- 开发服务器地址：`http://localhost:5173`

### 预览构建

```bash
# 预览生产构建
pnpm preview
```

---

## 🏗️ 构建命令

### 前端构建

```bash
# TypeScript 编译 + Vite 构建
pnpm build
```

**说明**：
- 先运行 `tsc` 检查类型错误
- 然后执行 `vite build` 生成生产资源
- 输出目录：`dist/`

### Tauri 应用构建

```bash
# 构建桌面应用（所有平台）
pnpm tauri build

# 仅构建（不生成安装包）
pnpm tauri build --debug
```

**输出文件位置**：
- Windows: `src-tauri/target/release/bundle/nsis/*.exe`
- macOS: `src-tauri/target/release/bundle/dmg/*.dmg`
- Linux: `src-tauri/target/release/bundle/deb/*.deb` 或 `appimage/*.AppImage`

---

## ✅ 代码质量检查

### TypeScript 类型检查

```bash
# 检查类型错误（不生成输出）
pnpm tsc --noEmit
```

**推荐**：修改前端代码后，使用此命令而非 `pnpm tauri dev` 进行快速类型检查。

### 代码格式化与检查

```bash
# Biome 格式化检查
pnpm exec biome check --write src/

# 仅检查不修复
pnpm exec biome check src/

# 格式化所有文件
pnpm exec biome format --write .
```

### Rust 代码检查

```bash
# Cargo 类型检查
pnpm exec cargo check --manifest-path src-tauri/Cargo.toml

# Rust 格式化
cd src-tauri && cargo fmt

# Clippy 代码检查
cd src-tauri && cargo clippy
```

---

## 📦 发布流程

### 自动发布（推荐）

```bash
# 发布新版本（例如：0.3.10）
pnpm release 0.3.10
```

**自动执行步骤**：
1. ✅ 检查工作区是否干净
2. ✅ 检查 tag 是否已存在
3. ✅ 更新版本号：
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
4. ✅ 创建 git commit
5. ✅ 创建 git tag（格式：`v0.3.10`）
6. ✅ 推送到远程仓库
7. ✅ 触发 GitHub Actions 自动构建

### 手动发布步骤

如果自动发布失败，可以手动执行：

```bash
# 1. 更新版本号（手动编辑以下文件）
# - package.json
# - src-tauri/Cargo.toml
# - src-tauri/tauri.conf.json

# 2. 提交更改
git add .
git commit -m "chore: release v0.3.10"

# 3. 创建 tag
git tag -a v0.3.10 -m "Release v0.3.10"

# 4. 推送到远程
git push origin main
git push origin v0.3.10
```

### 验证发布

**1. 检查 GitHub Actions**
```
https://github.com/liuaibin001/tvcbuddy/actions
```

**2. 验证 latest.json**
```
https://github.com/liuaibin001/tvcbuddy/releases/latest/download/latest.json
```

**3. 查看 Release 页面**
```
https://github.com/liuaibin001/tvcbuddy/releases/latest
```

应看到：
- ✅ 正确的版本号（如 v0.3.10）
- ✅ Windows/macOS/Linux 安装包
- ✅ latest.json 文件

---

## 🦀 Rust 后端命令

### 开发与测试

```bash
# 进入 Rust 项目目录
cd src-tauri

# 构建
cargo build

# 运行测试
cargo test

# 检查代码
cargo check

# 格式化代码
cargo fmt

# Clippy 检查
cargo clippy

# 查看依赖树
cargo tree

# 更新依赖
cargo update
```

### Tauri 特定命令

```bash
# 查看 Tauri 信息
pnpm tauri info

# 初始化图标
pnpm tauri icon path/to/icon.png

# 查看 Tauri 版本
pnpm tauri --version
```

---

## 📝 Git 操作

### 查看状态

```bash
# 查看工作区状态
git status

# 查看提交历史
git log --oneline -10

# 查看远程分支
git branch -r
```

### 标签管理

```bash
# 查看所有标签
git tag

# 查看特定标签
git show v0.3.10

# 删除本地标签
git tag -d v0.3.10

# 删除远程标签
git push origin :refs/tags/v0.3.10

# 重新创建标签
git tag -a v0.3.10 -m "Release v0.3.10"
git push origin v0.3.10
```

### 推送操作

```bash
# 推送代码到主分支
git push origin main

# 推送标签
git push origin v0.3.10

# 推送所有标签
git push origin --tags

# 强制推送（谨慎使用）
git push origin main --force
```

---

## 🛠️ 常见问题

### TypeScript 错误检查

**问题**：修改前端代码后想快速检查类型错误

**解决**：
```bash
pnpm tsc --noEmit
```
比 `pnpm tauri dev` 快得多，推荐用于快速验证。

### Rust 编译错误

**问题**：Rust 后端编译失败

**解决**：
```bash
cd src-tauri
cargo check
cargo clippy
```

### 发布后 latest.json 错误

**问题**：latest.json URL 是 `untagged-xxx` 而非正确的 release

**原因**：没有使用正确的 git tag 触发 GitHub Actions

**解决**：
```bash
# 使用自动发布脚本
pnpm release 0.3.10

# 或手动创建正确的 tag（必须以 'v' 开头）
git tag -a v0.3.10 -m "Release v0.3.10"
git push origin v0.3.10
```

### Git 推送失败

**问题**：SSH 认证失败

**解决方案 1 - 使用 HTTPS**：
```bash
git remote set-url origin https://github.com/liuaibin001/tvcbuddy.git
git push origin main
```

**解决方案 2 - 修复 SSH**：
```bash
# 测试 SSH 连接
ssh -T git@github.com

# 添加 SSH key
ssh-add ~/.ssh/id_rsa
```

**解决方案 3 - 使用 GitHub Desktop**：
使用 GUI 工具进行推送操作。

### 清理构建产物

```bash
# 清理前端构建
rm -rf dist

# 清理 Rust 构建
cd src-tauri && cargo clean

# 清理 node_modules（重新安装依赖）
rm -rf node_modules
pnpm install
```

### 重置到最新代码

```bash
# 丢弃所有本地修改
git reset --hard HEAD

# 拉取最新代码
git pull origin main
```

---

## 📚 延伸阅读

- [快速发布指南](./RELEASE_QUICKSTART.md) - 一分钟快速发布
- [完整发布指南](./docs/RELEASE_GUIDE.md) - 详细发布流程和故障排除
- [脚本说明](./scripts/README.md) - release.mjs / release.ps1 / release.sh 使用指南
- [README.md](./README.md) - 项目概述和功能说明

---

## 🆘 需要帮助？

遇到问题？检查以下资源：

1. **查看 GitHub Actions 日志**：检查构建失败原因
2. **查看 Tauri 文档**：https://tauri.app/v2/guides/
3. **查看项目 Issues**：搜索类似问题

---

**版本**: v1.0
**最后更新**: 2025-11-20
**维护者**: TVCBuddy Team
