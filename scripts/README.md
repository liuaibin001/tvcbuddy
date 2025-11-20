# 📜 Scripts - 脚本说明

本目录包含用于项目管理的各种脚本。

## 🚀 发布脚本

### release.mjs (推荐 - 跨平台)

Node.js 脚本，支持 Windows、macOS、Linux。

**使用方法**：
```bash
pnpm release 0.3.8
```

**功能**：
- ✅ 自动更新所有版本号
- ✅ 创建 git commit 和 tag
- ✅ 推送到远程仓库
- ✅ 触发 GitHub Actions 构建

### release.ps1 (Windows PowerShell)

Windows PowerShell 脚本。

**使用方法**：
```powershell
.\scripts\release.ps1 -Version 0.3.8
```

### release.sh (Linux/macOS Bash)

Bash 脚本，适用于 Linux 和 macOS。

**使用方法**：
```bash
chmod +x scripts/release.sh
./scripts/release.sh 0.3.8
```

## 📖 详细文档

查看完整的发布指南：[docs/RELEASE_GUIDE.md](../docs/RELEASE_GUIDE.md)

## ⚠️ 注意事项

1. **推送前确保工作区干净**
2. **版本号必须符合语义化版本规范** (x.y.z)
3. **需要有推送权限到 main 分支**
4. **首次使用前需要配置 GitHub Secrets**
   - `TAURI_SIGNING_PRIVATE_KEY`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## 🔍 常见问题

### 脚本权限错误

**Linux/macOS**:
```bash
chmod +x scripts/release.sh
```

**Windows PowerShell**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 推送失败

检查：
1. Git 认证是否正确
2. 是否有推送权限
3. 网络连接是否正常

### Tag 已存在

删除旧 tag 后重试：
```bash
git tag -d v0.3.8
git push origin :refs/tags/v0.3.8
pnpm release 0.3.8
```
