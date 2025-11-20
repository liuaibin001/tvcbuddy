# TVCBuddy (CC Mate) 🚀

<div align="center">

**一个现代化的桌面应用，用于管理 Claude Code 配置文件、MCP 服务器、Codex 知识库和本地代理**

[📥 下载最新版本](https://github.com/liuaibin001/tvcbuddy/releases/latest) • [🐛 报告问题](https://github.com/liuaibin001/tvcbuddy/issues) • [📖 发布指南](docs/RELEASE_GUIDE.md)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/github/v/release/liuaibin001/tvcbuddy)](https://github.com/liuaibin001/tvcbuddy/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/liuaibin001/tvcbuddy/releases)

</div>

---

## 📸 截图预览

### 配置管理
<img width="1170" alt="Claude Code 配置管理界面" src="https://github.com/user-attachments/assets/a0222a76-2ba0-4fdb-89bc-7f0d49efed5a" />

*快速切换多个 Claude Code 配置，一键激活不同的 API 密钥和设置*

### 使用统计
<img width="1170" alt="使用统计和分析面板" src="https://github.com/user-attachments/assets/fa4f34f3-d1eb-4dc8-b7c3-3e703613c42a" />

*可视化展示 Token 使用趋势和项目活动热力图*

---

## ✨ 核心功能

### 🔐 Claude Code 配置管理
- **多配置支持** - 创建、保存和快速切换多个配置
- **一键激活** - 系统托盘快速切换配置
- **配置编辑器** - 可视化编辑所有 Claude Code 设置
- **原始配置保护** - 自动备份原始配置到 `~/.ccconfig/claude_backup/`
- **快速对话** - 集成 GLM、Kimi、MiniMax 等国内 AI 模型

### 🔌 MCP 服务器管理
- **服务器配置** - 管理 Model Context Protocol (MCP) 服务器
- **预置模板** - 内置 exa, context7, github 等常用服务器配置
- **JSON 编辑器** - CodeMirror 集成的 JSON 编辑器
- **实时验证** - JSON 语法实时检查

### 📚 Codex 知识库管理
- **知识库配置** - 管理 Codex 知识库连接
- **连接测试** - 一键测试知识库连接状态
- **延迟监控** - 实时显示连接延迟
- **多服务器支持** - 管理多个知识库服务器

### 🌐 本地代理管理
- **网络信息查看** - 自动获取当前网络配置
- **节点快速切换** - HK、US、China 等节点一键切换
- **网站延迟测试** - 测试网站连接速度
- **公网 IP 查询** - 实时查询当前公网 IP
- **管理员权限检测** - 自动检测是否具有管理员权限

### 🤖 智能体与命令管理
- **智能体管理** - 配置和管理 Claude Code 智能体
- **全局命令** - 创建和组织全局命令
- **内存管理** - 读写全局 CLAUDE.md 内存文件

### 📊 使用统计与分析
- **Token 使用趋势** - 折线图展示 Token 消耗
- **活动热力图** - 日历热力图显示使用频率
- **项目管理** - 查看和管理所有项目
- **实时刷新** - 手动刷新使用数据

### 🔔 通知系统
- **Hook 事件通知** - 接收 Claude Code 的 Hook 事件
- **可配置通知类型** - 选择接收哪些类型的通知
- **系统原生通知** - 使用系统通知栏显示

### 🔄 自动更新
- **后台检查** - 每 30 分钟自动检查更新
- **一键更新** - 发现新版本后一键下载安装
- **安全签名验证** - 所有更新包都经过数字签名验证

### 🌍 国际化支持
- 🇺🇸 **English** - 完整英文支持
- 🇨🇳 **中文** - 完整中文支持
- 🇫🇷 **Français** - 法语支持
- 🇯🇵 **日本語** - 日语支持

---

## 🚀 快速开始

### 下载与安装

#### Windows
```bash
# 下载 .msi 安装包
https://github.com/liuaibin001/tvcbuddy/releases/latest/download/TVCBuddy_0.3.9_x64_en-US.msi

# 运行安装程序并跟随提示安装
```

#### macOS
```bash
# Intel Mac
https://github.com/liuaibin001/tvcbuddy/releases/latest/download/TVCBuddy_x64.dmg

# Apple Silicon (M1/M2/M3)
https://github.com/liuaibin001/tvcbuddy/releases/latest/download/TVCBuddy_aarch64.dmg

# 拖动到 Applications 文件夹即可
```

#### Linux
```bash
# Debian/Ubuntu (.deb)
wget https://github.com/liuaibin001/tvcbuddy/releases/latest/download/tvcbuddy_0.3.9_amd64.deb
sudo dpkg -i tvcbuddy_0.3.9_amd64.deb

# AppImage (通用)
wget https://github.com/liuaibin001/tvcbuddy/releases/latest/download/tvcbuddy_0.3.9_amd64.AppImage
chmod +x tvcbuddy_0.3.9_amd64.AppImage
./tvcbuddy_0.3.9_amd64.AppImage
```

### 首次运行

1. **启动应用** - 从应用程序列表中启动 TVCBuddy
2. **自动备份** - 首次运行会自动备份现有的 Claude Code 配置
3. **选择模块** - 从欢迎页面选择要使用的功能模块
4. **开始使用** - 开始管理你的 Claude Code 配置

---

## 🛠️ 技术栈

### 前端
- **React 19** - 最新的 React 框架
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS 4** - 现代化的 CSS 框架
- **shadcn/ui** - 高质量的 UI 组件库
- **React Query** - 强大的数据管理
- **React Router 7** - 路由管理
- **CodeMirror** - 代码编辑器
- **Recharts** - 图表库

### 后端
- **Tauri v2** - 轻量级桌面应用框架
- **Rust** - 高性能的系统编程语言
- **Tokio** - 异步运行时
- **Axum** - Web 框架（Hook 服务器）
- **Serde** - 序列化/反序列化

### 构建工具
- **Vite 7** - 快速的构建工具
- **pnpm** - 快速的包管理器
- **Cargo** - Rust 包管理器
- **GitHub Actions** - CI/CD 自动化

---

## 🔧 开发指南

### 环境要求

- **Node.js** 20+ (推荐使用最新 LTS 版本)
- **pnpm** 9+
- **Rust** 1.75+ (最新稳定版)
- **系统要求**:
  - Windows 10+ / Windows Server 2019+
  - macOS 10.15+ (Catalina)
  - Linux (主流发行版)

### 克隆项目

```bash
git clone https://github.com/liuaibin001/tvcbuddy.git
cd tvcbuddy
```

### 安装依赖

```bash
# 安装前端依赖
pnpm install

# Rust 依赖会在构建时自动安装
```

### 运行开发服务器

```bash
# 启动开发模式（包含热重载）
pnpm tauri dev
```

### 构建生产版本

```bash
# 构建前端
pnpm build

# 构建 Tauri 应用
pnpm tauri build
```

### 代码检查

```bash
# TypeScript 类型检查
pnpm tsc --noEmit

# Rust 编译检查
cd src-tauri
cargo check
```

### 发布新版本

```bash
# 使用自动化脚本
pnpm release 0.4.0

# 或查看完整文档
# docs/RELEASE_GUIDE.md
```

---

## 📂 项目结构

```
tvcbuddy/
├── src/                          # 前端源代码
│   ├── components/               # React 组件
│   │   ├── ui/                   # shadcn/ui 组件
│   │   ├── Layout.tsx            # 主布局
│   │   ├── UpdateButton.tsx      # 更新按钮
│   │   └── ...
│   ├── pages/                    # 页面组件
│   │   ├── WelcomePage.tsx       # 欢迎页
│   │   ├── ConfigSwitcherPage.tsx # 配置切换
│   │   ├── MCPPage.tsx           # MCP 管理
│   │   ├── CodexPage.tsx         # Codex 管理
│   │   ├── ProxyPage.tsx         # 代理管理
│   │   ├── UsagePage.tsx         # 使用统计
│   │   └── ...
│   ├── lib/                      # 工具库
│   │   ├── query.ts              # React Query 钩子
│   │   ├── utils.ts              # 工具函数
│   │   └── ...
│   ├── i18n/                     # 国际化
│   │   └── locales/              # 翻译文件
│   ├── main.tsx                  # 应用入口
│   └── router.tsx                # 路由配置
├── src-tauri/                    # Tauri 后端
│   ├── src/
│   │   ├── main.rs               # Rust 主入口
│   │   ├── lib.rs                # 应用初始化
│   │   ├── commands.rs           # Tauri 命令 (52个)
│   │   ├── tray.rs               # 系统托盘
│   │   └── hook_server.rs        # Hook 服务器
│   ├── capabilities/             # 权限配置
│   ├── tauri.conf.json           # Tauri 配置
│   └── Cargo.toml                # Rust 依赖
├── scripts/                      # 发布脚本
│   ├── release.mjs               # Node.js 发布脚本
│   ├── release.ps1               # PowerShell 脚本
│   └── release.sh                # Bash 脚本
├── docs/                         # 文档
│   └── RELEASE_GUIDE.md          # 发布指南
├── .github/
│   └── workflows/
│       └── release.yml           # GitHub Actions
├── package.json                  # Node.js 依赖
├── vite.config.ts                # Vite 配置
└── README.md                     # 本文件
```

---

## 🗂️ 数据存储

### 应用配置
```
~/.ccconfig/
├── stores.json                   # 配置存储
├── claude_backup/                # Claude 初始备份
└── ...
```

### Claude Code 配置
```
~/.claude/
├── settings.json                 # 当前活跃配置
├── config.json                   # 配置文件（含 API Key）
├── .claude.json                  # MCP 服务器
└── projects/                     # 项目目录
```

### 企业配置（只读）
```
# macOS
/Library/Application Support/ClaudeCode/
├── managed-settings.json
└── managed-mcp.json

# Linux
/etc/claude-code/

# Windows
C:\ProgramData\ClaudeCode\
```

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork 项目** - 点击右上角的 Fork 按钮
2. **创建分支** - `git checkout -b feature/your-feature`
3. **提交更改** - `git commit -m "feat: add your feature"`
4. **推送分支** - `git push origin feature/your-feature`
5. **创建 PR** - 在 GitHub 上创建 Pull Request

### 代码规范

- **TypeScript**: 使用 ESLint 和 Biome
- **Rust**: 使用 rustfmt 和 clippy
- **Commit**: 遵循 [Conventional Commits](https://www.conventionalcommits.org/)

### 开发原则

- ✅ 使用函数式组件和 Hooks
- ✅ 不使用 `export default`
- ✅ React Query 逻辑放在 `src/lib/query.ts`
- ✅ Tauri 命令放在 `src-tauri/src/commands.rs`
- ✅ 使用 `pnpm tsc --noEmit` 检查类型

---

## 🐛 故障排除

### 常见问题

**应用无法启动**
- 检查是否安装了最新版本
- 验证系统要求是否满足
- 从终端运行以查看错误信息

**配置无法加载**
- 确保 Claude Code 已安装并至少运行过一次
- 检查 `~/.claude/` 目录的文件权限
- 验证备份文件是否损坏

**网络切换失败**
- 确保以管理员权限运行（Windows 需要）
- 检查网络适配器名称是否正确
- 查看控制台日志获取详细错误信息

**自动更新不工作**
- 检查网络连接
- 验证 GitHub 是否可访问
- 查看是否有防火墙阻止

### 获取帮助

- 📖 [完整文档](https://github.com/liuaibin001/tvcbuddy/wiki)
- 🐛 [报告问题](https://github.com/liuaibin001/tvcbuddy/issues)
- 💬 [讨论区](https://github.com/liuaibin001/tvcbuddy/discussions)
- 📋 [发布指南](docs/RELEASE_GUIDE.md)

---

## 📊 功能对比

| 功能 | TVCBuddy | 原版 CC Mate |
|------|----------|-------------|
| 多配置管理 | ✅ | ✅ |
| MCP 服务器 | ✅ | ✅ |
| 使用统计 | ✅ | ✅ |
| 智能体管理 | ✅ | ✅ |
| Codex 知识库 | ✅ | ❌ |
| 本地代理管理 | ✅ | ❌ |
| 网络切换 | ✅ | ❌ |
| 延迟测试 | ✅ | ❌ |
| 自动更新 | ✅ | ✅ |
| 国际化 | ✅ (4种语言) | ✅ |

---

## 🔐 安全性

- ✅ **数字签名** - 所有发布包都经过数字签名
- ✅ **HTTPS** - 所有网络请求使用 HTTPS
- ✅ **本地存储** - 配置文件本地加密存储
- ✅ **权限控制** - 最小化权限请求
- ✅ **开源审计** - 代码完全开源可审计

---

## 📄 许可证

本项目采用 **GNU Affero General Public License v3.0** 许可证。

详见 [LICENSE](LICENSE) 文件。

### 关键条款
- ✅ 可以自由使用、修改、分发
- ✅ 必须开源修改后的代码
- ✅ 必须保留原作者信息
- ✅ 网络使用也必须提供源代码

---

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

特别感谢：
- [Tauri](https://tauri.app/) - 优秀的桌面应用框架
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 UI 组件库
- [Claude Code](https://claude.ai/code) - 强大的 AI 编程助手

---

## 📈 项目状态

- 🟢 **活跃开发中** - 定期更新和维护
- 📦 **最新版本**: v0.3.9
- 🐛 **已知问题**: [Issues](https://github.com/liuaibin001/tvcbuddy/issues)
- 📝 **更新日志**: [Releases](https://github.com/liuaibin001/tvcbuddy/releases)

---

<div align="center">

**使用 ❤️ 和 ☕ 构建**

[⭐ Star 这个项目](https://github.com/liuaibin001/tvcbuddy) • [🐛 报告 Bug](https://github.com/liuaibin001/tvcbuddy/issues) • [💡 功能建议](https://github.com/liuaibin001/tvcbuddy/discussions)

</div>
