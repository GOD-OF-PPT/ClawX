# Draft: CDK Activation Feature

## Requirements (confirmed)
- 用户输入CDK激活码作为首次启动必经步骤
- 验证CDK合法性，无效则提示错误并要求重新输入
- 验证通过后保存CDK，后续启动不再显示
- 默认配置AI模型：baseUrl=http://43.153.204.36:8317/, key=CDK, model=gpt-5.4

## Codebase Findings

### Setup Wizard Structure
- 5步骤：WELCOME → RUNTIME → PROVIDER → INSTALLING → COMPLETE
- 入口守卫：`App.tsx` 检查 `setupComplete` 状态，未完成则跳转 `/setup`
- 状态存储：`src/stores/settings.ts` 的 `setupComplete` 字段

### Settings Storage
- `electron/utils/store.ts`：electron-store 封装，存储应用配置
- `electron/services/secrets/secret-store.ts`：OS keychain 存储 API keys
- Provider配置：`electron/services/providers/provider-store.ts`

### Provider Configuration
- 支持创建 custom 类型 provider，可自定义 baseUrl 和 model
- API key 通过 keychain 安全存储
- 已有 provider 类型：openai, anthropic, google, custom 等

## Technical Decisions

### CDK输入界面位置
- **方案A**：新增 CDK 步骤（STEP.CDK），放在 WELCOME 和 RUNTIME 之间
- **方案B**：新增 CDK 步骤，放在 PROVIDER 步骤之前（RUNTIME 和 PROVIDER 之间）
- **方案C**：替换现有 PROVIDER 步骤，CDK验证后自动配置 provider

**推荐**：方案B - CDK验证独立于环境检查，但早于provider配置

### CDK存储位置
- **方案A**：electron-store (明文JSON)
- **方案B**：OS keychain (安全存储)
- **方案C**：加密后存 electron-store

**推荐**：方案B - CDK作为敏感凭证应安全存储

### Provider配置方式
- 创建 custom 类型 provider，ID为 "cdk-provider"
- baseUrl: http://43.153.204.36:8317/v1 (需确认是否需要 /v1 后缀)
- model: gpt-5.4
- apiKey: CDK值

## Open Questions

### 1. CDK验证逻辑
- 是否有后端API验证CDK？如果有，endpoint是什么？
- 验证API的请求格式是什么？(POST/GET, 请求体结构)
- CDK格式是什么？(UUID? 自定义格式? 长度限制?)

### 2. 错误处理
- 验证失败时显示什么错误信息？(是否需要区分不同错误类型)
- 是否需要限制重试次数？
- 网络错误如何处理？(离线场景)

### 3. Provider配置细节
- baseUrl 是否需要 `/v1` 后缀？(OpenAI兼容API通常需要)
- gpt-5.4 是否是真实模型名？
- 这个provider是否应该设为默认provider？
- 用户是否可以在设置中修改这个provider？

### 4. 多语言支持
- CDK步骤UI文本是否需要支持多语言？(当前项目支持 EN/ZH/JA)

### 5. CDK管理
- 用户是否可以更换CDK？(在设置中)
- CDK过期后如何处理？
- 是否需要显示CDK状态/到期时间？

## Scope Boundaries
- INCLUDE: 
  - 新增CDK输入步骤到setup wizard
  - CDK验证逻辑
  - CDK安全存储
  - 自动配置custom provider
  - 多语言UI文本
  
- EXCLUDE:
  - CDK购买/订阅系统
  - CDK有效期管理
  - 多CDK支持