# GitLab CI/CD 自动构建配置指南

## 📋 前提条件

### 1. GitLab Runner 配置

你需要在 GitLab 上配置相应的 Runner。有两个选择：

#### 选项 A：使用 GitLab 共享 Runner（推荐新手）
- GitLab.com 免费提供 Linux 和 Windows Runner
- 不需要自己维护服务器
- 每月有免费额度

#### 选项 B：自己搭建 GitLab Runner
需要准备一台 Windows/Linux/macOS 机器作为构建服务器。

---

## 🚀 快速开始

### 方法 1：使用完整多平台配置

1️⃣ **上传 `.gitlab-ci.yml` 到仓库根目录**
```bash
git add .gitlab-ci.yml
git commit -m "Add GitLab CI/CD for multi-platform builds"
git push
```

2️⃣ **配置 Runner 标签**
- Windows Runner: 添加 `windows` 标签
- Linux Runner: 添加 `docker` 标签
- macOS Runner: 添加 `macos` 标签

3️⃣ **触发构建**
- 推送到 `main` 分支自动构建
- 或者创建 Git Tag：
  ```bash
  git tag -a v0.3.4 -m "Release v0.3.4"
  git push origin v0.3.4
  ```

### 方法 2：仅 Windows 构建（简化版）

如果只需要 Windows 平台：

1️⃣ **删除或重命名现有配置**
```bash
mv .gitlab-ci.yml .gitlab-ci-full.yml.backup
```

2️⃣ **使用简化配置**
```bash
mv .gitlab-ci-windows-only.yml .gitlab-ci.yml
git add .gitlab-ci.yml
git commit -m "Add Windows-only CI/CD"
git push
```

---

## 🔧 GitLab Runner 安装（自建方案）

### Windows Runner 安装

1️⃣ **下载 GitLab Runner**
```powershell
# 创建目录
New-Item -ItemType Directory -Path "C:\GitLab-Runner"
cd C:\GitLab-Runner

# 下载
Invoke-WebRequest -Uri "https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-windows-amd64.exe" -OutFile "gitlab-runner.exe"
```

2️⃣ **注册 Runner**
```powershell
.\gitlab-runner.exe register
```

按提示输入：
- GitLab URL: `https://gitlab.com/` 或你的私有 GitLab 地址
- Registration token: 从 GitLab 项目 Settings > CI/CD > Runners 获取
- Description: `Windows Builder`
- Tags: `windows`
- Executor: `shell`

3️⃣ **安装并启动服务**
```powershell
.\gitlab-runner.exe install
.\gitlab-runner.exe start
```

4️⃣ **预装依赖**
```powershell
# 安装 Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装 Node.js
choco install nodejs -y --version=20.11.0

# 安装 Rust
choco install rust -y

# 安装 Visual Studio Build Tools (Tauri 需要)
choco install visualstudio2022buildtools -y
choco install visualstudio2022-workload-vctools -y
```

---

## 📦 构建产物位置

构建成功后，安装包会保存为 GitLab Artifacts：

**访问路径**：
```
项目页面 > CI/CD > Pipelines > 点击最新的 pipeline > 下载 artifacts
```

**文件位置**：
- **Windows**：
  - MSI: `src-tauri/target/release/bundle/msi/TVCBuddy_0.3.4_x64_en-US.msi`
  - NSIS: `src-tauri/target/release/bundle/nsis/TVCBuddy_0.3.4_x64-setup.exe`
- **Linux**：
  - DEB: `src-tauri/target/release/bundle/deb/*.deb`
  - AppImage: `src-tauri/target/release/bundle/appimage/*.AppImage`
- **macOS**：
  - DMG: `src-tauri/target/release/bundle/dmg/*.dmg`

---

## 🏷️ 自动发布版本

创建 Git Tag 会自动触发构建并创建 GitLab Release：

```bash
# 创建版本
git tag -a v0.3.5 -m "Release version 0.3.5"
git push origin v0.3.5
```

发布会包含所有平台的安装包下载链接。

---

## ⚙️ 高级配置

### 启用代码签名

在 GitLab 项目设置中添加环境变量：

**Settings > CI/CD > Variables**

添加：
- `TAURI_SIGNING_PRIVATE_KEY`: 你的私钥内容
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: 私钥密码
- 勾选 "Masked" 和 "Protected"

然后在 `.gitlab-ci.yml` 的 `script` 部分添加：
```yaml
script:
  - export TAURI_SIGNING_PRIVATE_KEY=$TAURI_SIGNING_PRIVATE_KEY
  - export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=$TAURI_SIGNING_PRIVATE_KEY_PASSWORD
  - pnpm tauri build
```

### 缓存优化

如果构建太慢，可以调整缓存策略：

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .cargo/
    - src-tauri/target/release/
  policy: pull-push  # 同时读写缓存
```

---

## 🐛 常见问题

### 1. Runner 找不到
**问题**：Pipeline 一直 pending
**解决**：检查 Runner 标签是否匹配，或使用共享 Runner

### 2. Rust 编译失败
**问题**：`rustc not found`
**解决**：在 Runner 机器上预装 Rust，或在 `before_script` 中安装

### 3. WebView2 错误（Windows）
**问题**：缺少 WebView2 运行时
**解决**：在 Runner 上安装 WebView2 Runtime：
```powershell
choco install webview2-runtime -y
```

### 4. 构建时间太长
**问题**：超过 1 小时
**解决**：
- 启用并优化缓存
- 使用更强大的 Runner 机器
- 考虑增量构建

---

## 📊 监控构建

**查看构建状态**：
```
项目页面 > CI/CD > Pipelines
```

**查看构建日志**：
点击 Pipeline > 点击 Job > 查看完整日志

**构建徽章**：
```markdown
[![pipeline status](https://gitlab.com/<namespace>/<project>/badges/<branch>/pipeline.svg)](https://gitlab.com/<namespace>/<project>/-/commits/<branch>)
```

---

## 💡 提示

1. **首次构建会比较慢**（30-60分钟），因为需要下载依赖
2. **后续构建会快很多**（5-15分钟），得益于缓存
3. **建议只在需要发布时才构建所有平台**，日常开发可以只构建当前平台
4. **使用 GitLab 共享 Runner 可以省去维护成本**，但可能有队列等待

---

## 🎯 下一步

1. ✅ 上传 `.gitlab-ci.yml` 到仓库
2. ✅ 配置 GitLab Runner（或使用共享 Runner）
3. ✅ 推送代码或创建 Tag 触发构建
4. ✅ 从 Artifacts 下载安装包
5. ✅ （可选）配置自动发布到 GitLab Releases

享受自动化构建带来的便利！🚀
