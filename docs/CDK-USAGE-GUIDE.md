# ClawX CDK 激活使用指南

本文档介绍如何生成 CDK、配置 GitHub Gist 以及用户安装激活的完整流程。

---

## 目录

1. [概述](#概述)
2. [CDK 生成](#cdk-生成)
3. [配置 GitHub Gist](#配置-github-gist)
4. [用户安装激活流程](#用户安装激活流程)
5. [CDK 管理最佳实践](#cdk-管理最佳实践)
6. [常见问题](#常见问题)

---

## 概述

### 什么是 CDK？

CDK (Content Distribution Key) 是 ClawX 的激活密钥，用于：
- 验证用户是否有权使用软件
- 绑定 API Key 以访问 AI 服务
- 控制使用有效期

### 工作原理

```
┌─────────────────────────────────────────────────────────────┐
│                      CDK 验证流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  用户输入 CDK                                                │
│       │                                                     │
│       ▼                                                     │
│  从 GitHub Gist 获取有效 CDK 列表                            │
│       │                                                     │
│       ├── CDK 不在列表中 → 显示错误 → 退出程序               │
│       │                                                     │
│       ├── 网络请求失败 → 显示错误 → 退出程序                 │
│       │                                                     │
│       └── CDK 在列表中 → 验证格式和有效期                    │
│              │                                              │
│              └── 验证通过 → 激活成功 → 进入主界面            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### CDK 格式

采用 6 段格式（共 29 个字符）：

```
XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
 │     │     │     │     │
 │     │     │     │     └── 校验码段
 │     │     │     └──────── API Key 编码段 4
 │     │     └────────────── API Key 编码段 3
 │     └──────────────────── API Key 编码段 2
 └────────────────────────── 日期段
```

---

## CDK 生成

### 步骤 1：打开 CDK 生成器

在项目目录下找到 `tools/cdk-generator.html`，用浏览器打开：

```bash
# macOS
open tools/cdk-generator.html

# Windows
start tools/cdk-generator.html

# Linux
xdg-open tools/cdk-generator.html
```

### 步骤 2：填写必要信息

| 字段 | 说明 | 示例 |
|------|------|------|
| **API Key** | 用户的 API 密钥（至少 10 个字符） | `sk-tJ48kSQx9CItbGO0g` |
| **Random Seed** | 随机种子（可选，留空自动生成） | 留空或输入任意字符串 |
| **Expiration Date** | CDK 有效期截止日期 | 选择日期 |

### 步骤 3：生成 CDK

点击 **"Generate CDK"** 按钮，系统将生成 6 段格式的 CDK。

**生成结果示例：**

```
CDK: aB3x-K7mN-pQ2s-T9vW-yZ4c-L8dE
Expiration: 2027-03-10
API Key: sk-tJ48kSQx9CItbGO0g
```

### 步骤 4：复制 CDK

点击 **"📋 Copy CDK"** 按钮将 CDK 复制到剪贴板。

### 字段说明

| 段名 | 含义 |
|------|------|
| Date Part | 编码后的有效期日期 |
| API Key Segments 1-4 | API Key 的哈希编码（单向不可逆） |
| Checksum Part | 校验码，验证 CDK 完整性 |

### 历史记录

生成器会自动保存最近 50 条 CDK 记录，方便查看和复制。

---

## 配置 GitHub Gist

### 步骤 1：创建 GitHub Gist

1. 登录 GitHub
2. 访问 https://gist.github.com/
3. 点击 **"New gist"**

### 步骤 2：创建 JSON 文件

文件名：`valid-cdk.json`

内容格式：

```json
{
  "validCdk": [
    "aB3x-K7mN-pQ2s-T9vW-yZ4c-L8dE",
    "cD5y-L8nP-mR3t-U0wX-zA5b-M9eF",
    "eF6z-M9oP-nS4u-V1xY-bC6c-N0fG"
  ]
}
```

### 步骤 3：获取 Raw URL

1. 创建 Gist 后，点击 **"Raw"** 按钮
2. 复制浏览器地址栏的 URL

**URL 格式示例：**

```
https://gist.githubusercontent.com/{username}/{gist-id}/raw/{commit-hash}/valid-cdk.json
```

### 步骤 4：配置 ClawX 使用该 Gist

在 `electron/utils/cdk-remote-validation.ts` 中修改 `GIST_URL`：

```typescript
const GIST_URL = 'https://gist.githubusercontent.com/YOUR_USERNAME/YOUR_GIST_ID/raw/YOUR_COMMIT_HASH/valid-cdk.json';
```

### 重要：CDK 管理流程

```
┌─────────────────────────────────────────────────────────────┐
│                   CDK 生命周期管理                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 生成新 CDK                                              │
│     └── 使用 CDK Generator 生成                             │
│                                                             │
│  2. 添加到 Gist                                             │
│     └── 将 CDK 添加到 validCdk 数组                         │
│                                                             │
│  3. 分发给用户                                              │
│     └── 通过邮件/消息等方式发送给用户                       │
│                                                             │
│  4. 用户激活                                                │
│     └── 用户输入 CDK 完成激活                               │
│                                                             │
│  5. 从 Gist 删除 ⚠️ 重要                                    │
│     └── 激活后立即从 validCdk 数组中删除该 CDK              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 用户安装激活流程

### 步骤 1：下载并安装 ClawX

从官方渠道下载对应平台的安装包：

| 平台 | 文件格式 |
|------|----------|
| macOS | `.dmg` 或 `.zip` |
| Windows | `.exe` |
| Linux | `.AppImage` 或 `.deb` |

### 步骤 2：首次启动

首次启动时，ClawX 会显示激活界面：

```
┌─────────────────────────────────────────────┐
│                                             │
│           🔑 Activate ClawX                 │
│                                             │
│   Enter your CDK to activate the app        │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │ XXXX-XXXX-XXXX-XXXX-XXXX-XXXX       │   │
│   └─────────────────────────────────────┘   │
│                                             │
│              [ Activate ]                   │
│                                             │
└─────────────────────────────────────────────┘
```

### 步骤 3：输入 CDK

1. 输入收到的 CDK（支持以下格式）：
   - 带分隔符：`XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`
   - 不带分隔符：系统会自动格式化

2. 点击 **"Activate"** 按钮

### 步骤 4：验证结果

**成功情况：**
- 显示 ✓ "Activation successful!"
- 自动跳转到主界面

**失败情况：**

| 错误类型 | 对话框内容 | 后续操作 |
|----------|------------|----------|
| CDK 无效 | "Invalid CDK - The CDK you entered is not valid. Please contact support." | 点击确定后程序退出 |
| 网络错误 | "Network Error - Unable to verify CDK. Please check your internet connection." | 点击确定后程序退出 |
| CDK 已过期 | "CDK expired on YYYY-MM-DD" | 点击确定后程序退出 |

### 步骤 5：激活成功

激活成功后：
1. CDK 信息保存到本地配置
2. 默认 Provider 自动配置（使用 CDK 中编码的 API Key）
3. 下次启动无需再次激活

---

## CDK 管理最佳实践

### 安全建议

1. **一次性使用**
   - 每个 CDK 只能激活一次
   - 用户激活后，务必从 Gist 的 `validCdk` 数组中删除
   - 建议：用户激活后 5 分钟内删除

2. **定期清理**
   - 定期检查 Gist 中的 CDK
   - 删除已过期的 CDK
   - 删除已分发给用户但长期未激活的 CDK

3. **记录管理**
   - 使用表格记录 CDK 分发情况
   - 包含：CDK、API Key、有效期、分发对象、激活状态

### 推荐的 CDK 分发表格模板

| CDK | API Key | 有效期 | 分发对象 | 分发日期 | 激活状态 | 备注 |
|-----|---------|--------|----------|----------|----------|------|
| aB3x-... | sk-tJ48... | 2027-03-10 | user@example.com | 2026-03-10 | ✅ 已激活 | VIP用户 |
| cD5y-... | sk-xK92... | 2026-06-15 | user2@example.com | 2026-03-11 | ⏳ 未激活 | 测试用户 |

### Gist 更新示例

**添加新 CDK 前：**

```json
{
  "validCdk": [
    "aB3x-K7mN-pQ2s-T9vW-yZ4c-L8dE"
  ]
}
```

**添加新 CDK 后：**

```json
{
  "validCdk": [
    "aB3x-K7mN-pQ2s-T9vW-yZ4c-L8dE",
    "cD5y-L8nP-mR3t-U0wX-zA5b-M9eF"
  ]
}
```

**用户激活后删除：**

```json
{
  "validCdk": [
    "cD5y-L8nP-mR3t-U0wX-zA5b-M9eF"
  ]
}
```

---

## 常见问题

### Q1: CDK 输入后提示 "Invalid CDK"

**可能原因：**
1. CDK 未添加到 Gist 的 `validCdk` 数组
2. CDK 已被其他用户激活并从数组中删除
3. CDK 格式错误

**解决方案：**
1. 检查 Gist 中是否包含该 CDK
2. 联系管理员确认 CDK 状态
3. 确保输入时没有多余空格

### Q2: CDK 输入后提示 "Network Error"

**可能原因：**
1. 网络连接问题
2. GitHub 服务不可用
3. Gist URL 配置错误

**解决方案：**
1. 检查网络连接
2. 确认能否访问 https://github.com
3. 联系管理员确认 Gist URL 正确

### Q3: 用户想重置 CDK

**解决方案：**
1. macOS: 删除 `~/Library/Application Support/clawx/settings.json`
2. Windows: 删除 `%APPDATA%/clawx/settings.json`
3. Linux: 删除 `~/.config/clawx/settings.json`

删除后重启应用，将重新显示激活界面。

### Q4: 如何修改已激活的 API Key？

进入 **Settings → Providers**，选择默认 Provider 进行修改。

### Q5: CDK 有效期过了会怎样？

- 已激活的用户不受影响（本地验证通过）
- 新激活会提示 "CDK expired on YYYY-MM-DD"

---

## 技术细节

### CDK 编码算法

```
日期段 = Base62(年份偏移 * 10000 + 月份 * 100 + 日期)
API Key 段 = Base62(Hash(API Key + 段索引 + 密钥))
校验段 = Base62(Hash(密钥 + 日期 + API Key + 随机种子))
```

### 验证流程

1. **远程验证**：从 Gist 获取有效 CDK 列表，检查输入的 CDK 是否存在
2. **格式验证**：验证 CDK 格式和字符有效性
3. **有效期验证**：解码日期段，检查是否过期
4. **本地保存**：验证通过后保存到 `settings.json`

### 网络超时

- Gist 请求超时：10 秒
- 超时后视为网络错误，阻止激活

---

## 联系支持

如有问题，请联系：[support@example.com]

---

*文档版本：1.0.0*
*最后更新：2026-03-11*