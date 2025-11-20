# 📦 Release Guide - 发布指南

本文档介绍如何正确发布新版本，并修复自动更新问题。

## 🎯 问题诊断

### 为什么自动更新不工作？

**问题症状**：
- latest.json 的 URL 是 `releases/download/untagged-xxx/latest.json`
- 而不是期望的 `releases/latest/download/latest.json`

**根本原因**：
没有通过 git tag 触发 GitHub Actions，导致创建了 untagged release。

## ✅ 正确的发布流程

### 方法 1: 使用自动化脚本 (推荐)

```bash
# 确保工作区干净
git status

# 运行发布脚本
pnpm release 0.3.8

# 或者使用 PowerShell (Windows)
.\scripts\release.ps1 -Version 0.3.8

# 或者使用 Bash (Linux/macOS)
./scripts/release.sh 0.3.8
```

脚本会自动完成以下步骤：
1. ✅ 检查工作区是否干净
2. ✅ 检查 tag 是否已存在
3. ✅ 更新 `package.json`、`tauri.conf.json`、`Cargo.toml` 中的版本号
4. ✅ 提交版本更新
5. ✅ 创建 git tag
6. ✅ 推送到远程仓库
7. ✅ 触发 GitHub Actions 自动构建

### 方法 2: 手动发布

```bash
# 1. 更新版本号
npm version 0.3.8 --no-git-tag-version

# 2. 手动更新 src-tauri/tauri.conf.json 中的 version
# 手动更新 src-tauri/Cargo.toml 中的 version

# 3. 提交更改
git add .
git commit -m "chore: bump version to 0.3.8"

# 4. 创建 tag (⚠️ 关键步骤!)
git tag -a v0.3.8 -m "Release version 0.3.8"

# 5. 推送到远程
git push origin main
git push origin v0.3.8  # ⚠️ 必须推送 tag!
```

## 🔧 修复现有的 Untagged Release

### 步骤 1: 删除错误的 Release

在 GitHub 上手动删除 untagged release：
```
https://github.com/liuaibin001/tvcbuddy/releases
```

找到 untagged release，点击删除。

### 步骤 2: 删除本地和远程的错误 Tag

```bash
# 查看所有 tag
git tag -l

# 删除本地 tag (如果有错误的)
git tag -d v0.3.7

# 删除远程 tag
git push origin :refs/tags/v0.3.7
```

### 步骤 3: 重新发布

```bash
# 使用自动化脚本重新发布
pnpm release 0.3.8
```

## 📋 发布检查清单

在发布前，确保：

- [ ] 所有代码已提交
- [ ] 测试通过
- [ ] 版本号符合规范 (x.y.z)
- [ ] CHANGELOG 已更新（如果有）
- [ ] 有管理员权限推送到 main 分支
- [ ] 有 TAURI_SIGNING_PRIVATE_KEY 密钥（在 GitHub Secrets 中）

## 🎬 GitHub Actions 工作流

当你推送 tag 后，GitHub Actions 会自动：

1. **触发条件**: `git push origin v*`
2. **构建平台**: Windows, macOS (Intel + Apple Silicon), Linux
3. **生成文件**:
   - 各平台的安装包 (`.msi`, `.dmg`, `.deb`, `.AppImage`)
   - `latest.json` 更新清单
   - 签名文件 `.sig`

4. **发布位置**:
   ```
   https://github.com/liuaibin001/tvcbuddy/releases/tag/v0.3.8
   ```

5. **latest.json 地址** (自动更新使用):
   ```
   https://github.com/liuaibin001/tvcbuddy/releases/latest/download/latest.json
   ```

## 🔍 验证发布是否成功

### 检查 GitHub Actions

访问: https://github.com/liuaibin001/tvcbuddy/actions

确保所有平台的构建都成功 ✅

### 检查 Release

访问: https://github.com/liuaibin001/tvcbuddy/releases/latest

确保能看到：
- ✅ 正确的版本号
- ✅ 所有平台的安装包
- ✅ `latest.json` 文件

### 测试自动更新

```bash
# 在浏览器中访问
https://github.com/liuaibin001/tvcbuddy/releases/latest/download/latest.json

# 应该返回类似这样的 JSON:
{
  "version": "0.3.8",
  "date": "2025-01-20T10:30:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://github.com/liuaibin001/tvcbuddy/releases/download/v0.3.8/...",
      "signature": "..."
    },
    ...
  }
}
```

## 📝 版本号规范

遵循 [Semantic Versioning](https://semver.org/):

- **Major.Minor.Patch** (例如: `1.2.3`)
  - **Major**: 不兼容的 API 变更
  - **Minor**: 向后兼容的功能新增
  - **Patch**: 向后兼容的问题修复

示例：
- `0.3.4` → `0.3.5`: 修复 bug
- `0.3.5` → `0.4.0`: 新增功能
- `0.4.0` → `1.0.0`: 重大更新

## 🆘 常见问题

### Q: 推送 tag 失败，提示 "tag already exists"

```bash
# 删除本地 tag
git tag -d v0.3.8

# 删除远程 tag
git push origin :refs/tags/v0.3.8

# 重新创建
pnpm release 0.3.8
```

### Q: GitHub Actions 构建失败

检查：
1. `TAURI_SIGNING_PRIVATE_KEY` 是否正确配置
2. `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 是否正确
3. 版本号是否在所有文件中都更新了

### Q: latest.json 404 Not Found

可能原因：
1. Release 还在构建中（等待几分钟）
2. Release 是 draft 或 prerelease（检查 release 设置）
3. Tag 没有正确推送（检查 `git tag -l` 和远程 tags）

### Q: 应用内更新检查失败

确认：
1. latest.json URL 正确
2. 应用版本低于 latest.json 中的版本
3. 网络连接正常
4. 签名验证通过（pubkey 正确配置）

## 🔐 签名密钥管理

### 生成新的签名密钥

```bash
# 使用 Tauri CLI 生成
pnpm tauri signer generate

# 输出:
# Private Key: dW50cnVzdGVk... (保存到 GitHub Secrets)
# Public Key: dW50cnVzdGVk...  (保存到 tauri.conf.json)
```

### 配置 GitHub Secrets

在 GitHub 仓库设置中添加：

1. `TAURI_SIGNING_PRIVATE_KEY`: 私钥
2. `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: 密钥密码（如果有）

路径: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

## 📚 相关文档

- [Tauri Updater 文档](https://v2.tauri.app/plugin/updater/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)

---

**最后更新**: 2025-01-20
**维护者**: CCMate Team
