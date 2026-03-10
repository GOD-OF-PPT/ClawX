# Fix CDK API Key Encoding Bug

## TL;DR
> **Summary**: CDK 生成算法未将 API Key 编码进 CDK，导致验证时无法提取正确的 API Key
> **Deliverables**: 扩展 CDK 格式为 6 段 (24字符)，支持 20 字符 API Key 编码
> **Effort**: Short
> **Parallel**: NO
> **Critical Path**: Algorithm Design → Generator Update → Validator Update → Activation Flow Update

## Context

### Original Request
用户发现 bug：写入的 provider apiKey 是 CDK 本身，而不是 Random Seed (真正的 API Key)。

### API Key 样例分析
```
样例: sk-tJ48kSQx9CItbGO0g
长度: 20 字符
字符集: a-z, A-Z, 0-9, -
```

### Bug Analysis

**当前 CDK 结构**：
```
datePart-checksumPart-randomPart-randomPart (16字符)

问题: 80 bits 编码空间无法存储 120 bits 的 API Key 数据
```

**解决方案**：
```
新 CDK 结构: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (24字符, 6段)

- datePart (4字符): 过期日期
- seedPart1-4 (16字符): API Key 编码
- checksumPart (4字符): 校验和

编码空间: 120 bits，足够编码 20 字符 API Key
```

## Work Objectives

### Core Objective
扩展 CDK 格式为 6 段，将 API Key 编码进 CDK，使验证时可以解码还原。

### Deliverables
1. 更新 `tools/cdk-generator.html` - 新算法生成 6 段 CDK
2. 更新 `electron/utils/cdk-validation.ts` - 新算法解码 API Key
3. 更新 `src/pages/Activation/index.tsx` - 使用解码后的 API Key
4. 更新 `electron/main/ipc-handlers.ts` - 返回解码后的 API Key

### Definition of Done
- [ ] CDK 格式为 6 段 (24 字符)
- [ ] CDK 包含编码后的 API Key (最多 20 字符)
- [ ] 验证时可正确解码 API Key
- [ ] Activation 流程使用解码后的 API Key 创建 provider
- [ ] 所有测试通过

### Must Have
- API Key 限制为 20 个字符
- 支持字符：a-z, A-Z, 0-9, -
- CDK 格式保持 `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`
- 算法在生成器和验证器中保持一致

### Must NOT Have
- 不改变现有的过期日期验证逻辑
- 不支持超过 20 字符的 API Key

## Verification Strategy
- Test CDK generation with known API Key
- Test CDK validation returns correct API Key
- Test Activation flow creates provider with correct API Key
- Run `pnpm test`, `pnpm run typecheck`, `pnpm run lint`

## Execution Strategy

### Parallel Execution Waves
Wave 1: Algorithm files (sequential due to dependency)
Wave 2: Integration files

### Dependency Matrix
- cdk-generator.html → cdk-validation.ts (must match algorithm)
- cdk-validation.ts → Activation/index.tsx (provides decodeCdk)
- cdk-validation.ts → ipc-handlers.ts (provides decodeCdk)

## TODOs

- [ ] 1. Update CDK Generator Algorithm (6 segments)

  **What to do**: 修改 `tools/cdk-generator.html` 的 CDK 生成算法，扩展为 6 段格式
  **Must NOT do**: 不要改变 CDK 段长度（保持每段 4 字符）

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: Single file algorithm update
  - Skills: [] — No special skills needed

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2, 3, 4] | Blocked By: []

  **New Algorithm**:
  ```javascript
  // 字符集: a-z, A-Z, 0-9, - (共 64 种字符)
  const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
  
  function encodeApiKey(apiKey) {
    // 20字符 API Key → 16字符 base64 编码
    // 使用 4 个 4字符段存储
    // 每段编码 5 个 API Key 字符
    const padded = apiKey.padEnd(20, '\0');
    const segments = [];
    for (let i = 0; i < 4; i++) {
      const chunk = padded.slice(i * 5, (i + 1) * 5);
      const num = encodeChunk(chunk, CHARSET);
      segments.push(base32Encode(num));
    }
    return segments; // [seedPart1, seedPart2, seedPart3, seedPart4]
  }
  
  function generateCdk() {
    // CDK: datePart-seedPart1-seedPart2-seedPart3-seedPart4-checksumPart
    const seedParts = encodeApiKey(apiKey);
    const cdk = `${datePart}-${seedParts[0]}-${seedParts[1]}-${seedParts[2]}-${seedParts[3]}-${checksumPart}`;
  }
  ```

  **Acceptance Criteria**:
  - [ ] 生成 6 段 CDK (24 字符)
  - [ ] 同一 API Key + 日期生成相同 CDK
  - [ ] 支持 `sk-tJ48kSQx9CItbGO0g` 格式的 API Key

  **QA Scenarios**:
  ```
  Scenario: Generate CDK with 20-char API Key
    Tool: Bash
    Steps: Open cdk-generator.html, enter "sk-tJ48kSQx9CItbGO0g", set date, click generate
    Expected: CDK displayed as 6 segments, API Key shown as encoded
    Evidence: Screenshot or console log
  ```

  **Commit**: YES | Message: `fix(cdk): encode API key into 6-segment CDK` | Files: tools/cdk-generator.html

- [ ] 2. Update CDK Validation with Decode Function (6 segments)

  **What to do**: 修改 `electron/utils/cdk-validation.ts` 添加 6 段解码函数
  **Must NOT do**: 不要破坏现有的格式验证逻辑

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: Single file algorithm update
  - Skills: [] — No special skills needed

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [3, 4] | Blocked By: [1]

  **New Functions**:
  ```typescript
  const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
  
  export interface CdkDecodeResult extends CdkValidationResult {
    apiKey?: string;
  }

  export function decodeCdk(cdk: string): CdkDecodeResult {
    // 1. 验证格式 (6 段)
    const parts = cdk.split('-');
    if (parts.length !== 6) {
      return { valid: false, error: 'Invalid CDK format' };
    }
    
    // 2. 解码日期
    const datePart = parts[0];
    const expirationDate = decodeDate(datePart);
    
    // 3. 解码 API Key
    const [seedPart1, seedPart2, seedPart3, seedPart4] = parts.slice(1, 5);
    const apiKey = decodeApiKey([seedPart1, seedPart2, seedPart3, seedPart4]);
    
    // 4. 验证校验和
    const checksumPart = parts[5];
    // ...
    
    return { valid: true, expirationDate, apiKey };
  }
  ```

  **Acceptance Criteria**:
  - [ ] decodeCdk 函数返回正确的 API Key
  - [ ] 与生成器算法完全一致
  - [ ] 支持 6 段格式验证

  **Commit**: YES | Message: `fix(cdk): add decode function for 6-segment CDK` | Files: electron/utils/cdk-validation.ts

- [ ] 3. Update Activation Flow to Use Decoded API Key

  **What to do**: 修改 `src/pages/Activation/index.tsx` 使用解码后的 API Key
  **Must NOT do**: 不要改变 CDK 输入 UI

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: Minor integration change
  - Skills: [] — No special skills needed

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [] | Blocked By: [2]

  **Changes**:
  ```typescript
  // In handleActivate:
  const result = await invokeIpc('cdk:verify', cdk);
  // result.apiKey is the decoded API Key (e.g., "sk-tJ48kSQx9CItbGO0g")
  
  // Use result.apiKey for provider creation
  await setupDefaultProvider(result.apiKey);
  ```

  **Acceptance Criteria**:
  - [ ] Activation 使用解码后的 API Key 创建 provider
  - [ ] 支持 6 段 CDK 输入

  **Commit**: YES | Message: `fix(activation): use decoded API key for provider` | Files: src/pages/Activation/index.tsx

- [ ] 4. Update IPC Handler to Return Decoded API Key

  **What to do**: 修改 `electron/main/ipc-handlers.ts` 的 cdk:verify handler
  **Must NOT do**: 不要改变 IPC 接口结构

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: Minor handler update
  - Skills: [] — No special skills needed

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [] | Blocked By: [2]

  **Changes**:
  ```typescript
  ipcMain.handle('cdk:verify', async (_, cdk: string) => {
    const result = decodeCdk(cdk);  // New function
    if (!result.valid) {
      return { success: false, error: result.error };
    }
    // Store the decoded API Key
    await setSetting('cdk', result.apiKey);
    await setSetting('cdkVerified', true);
    return { 
      success: true, 
      apiKey: result.apiKey, 
      expirationDate: result.expirationDate 
    };
  });
  ```

  **Commit**: YES | Message: `fix(ipc): return decoded API key from cdk verify` | Files: electron/main/ipc-handlers.ts

- [ ] 5. Update Activation Page Input Validation

  **What to do**: 更新 `src/pages/Activation/index.tsx` 的输入验证支持 6 段格式
  **Must NOT do**: 不要改变整体 UI 布局

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: Minor validation update
  - Skills: [] — No special skills needed

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [] | Blocked By: [2]

  **Changes**:
  ```typescript
  const handleCdkChange = (value: string) => {
    // Support 6 segments (24 chars + 5 dashes = 29 chars)
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let result = '';
    for (let i = 0; i < formatted.length && i < 24; i++) {
      if (i > 0 && i % 4 === 0) result += '-';
      result += formatted[i];
    }
    setCdk(result);
  };
  
  // Update placeholder
  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
  maxLength={29}
  
  // Update validation
  disabled={validating || cdk.replace(/-/g, '').length < 24}
  ```

  **Commit**: YES | Message: `fix(activation): support 6-segment CDK input` | Files: src/pages/Activation/index.tsx

## Final Verification Wave
- [ ] F1. All tests pass — executor
- [ ] F2. Manual QA: Generate 6-segment CDK → Verify → Check API Key — executor

## Commit Strategy
Atomic commits per file, clear messages describing the fix.

## Success Criteria
- CDK format is 6 segments (24 characters)
- CDK contains encoded API Key (up to 20 characters)
- Validation extracts correct API Key
- Provider receives correct API Key (e.g., "sk-tJ48kSQx9CItbGO0g")
- All tests pass