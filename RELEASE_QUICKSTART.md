# 🚀 Release Quick Start - 快速发布指南

## 🎯 一分钟快速发布

```bash
# 1. 提交所有更改
git add .
git commit -m "你的提交信息"

# 2. 运行发布命令（例如发布 0.3.8 版本）
pnpm release 0.3.8

# 3. 等待 GitHub Actions 构建完成
# 访问: https://github.com/liuaibin001/tvcbuddy/actions
```

完成！✅ 自动更新现在可以正常工作了。

## 📋 发布后验证

**1. 检查 latest.json 是否可访问：**
```
https://github.com/liuaibin001/tvcbuddy/releases/latest/download/latest.json
```

**2. 检查 Release 页面：**
```
https://github.com/liuaibin001/tvcbuddy/releases/latest
```

应该看到：
- ✅ 正确的版本号（例如 v0.3.8）
- ✅ 各平台安装包（Windows, macOS, Linux）
- ✅ latest.json 文件

## 🔧 修复现有的 untagged release

如果你已经有 untagged release，按以下步骤修复：

```bash
# 1. 在 GitHub 上删除 untagged release
# 访问: https://github.com/liuaibin001/tvcbuddy/releases
# 找到 untagged release 并删除

# 2. 提交当前所有更改
git add .
git commit -m "fix: update release workflow"

# 3. 发布新版本
pnpm release 0.3.8
```

## ❓ 遇到问题？

查看完整文档：[docs/RELEASE_GUIDE.md](docs/RELEASE_GUIDE.md)

## 📝 版本号规范

- Bug 修复: `0.3.4` → `0.3.5`
- 新功能: `0.3.5` → `0.4.0`
- 重大更新: `0.4.0` → `1.0.0`

---

**记住**: 只有通过 `git tag` 触发的 release 才会生成正确的 `latest.json` URL！
