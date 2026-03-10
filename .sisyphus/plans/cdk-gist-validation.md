# CDK Gist Validation - One-Time Use Implementation

## TL;DR
> **Summary**: Implement GitHub Gist-based CDK validation to ensure one-time use. Fetch valid CDK list from Gist, validate user input, block activation if CDK not found or network fails.
> **Deliverables**: Remote validation module, modified IPC handler, updated Activation page with error dialog
> **Effort**: Quick
> **Parallel**: NO - Sequential dependencies
> **Critical Path**: Task 1 → Task 2 → Task 3

## Context

### Original Request
- "一个cdk只能用一次，激活过后不能再用"
- "我在github gist上创建了一个json文件用来保存所有可用的cdk"
- "用户输入cdk后可以拉取json判断输入的cdk是否在validCdk数组中"
- "不在则非法cdk，直接退出程序"

### Interview Summary
| Question | Decision |
|----------|----------|
| Exit behavior | Show error dialog first, then quit |
| Network failure | Block activation (fail-safe mode) |
| Case sensitivity | Case-insensitive using normalizeCdk() |
| Deletion mechanism | Manual deletion by user after activation |

### Metis Review (gaps addressed)
- Network failure handling: Block activation (fail-safe)
- Timeout: 10 seconds for Gist fetch
- Use `proxyAwareFetch` from existing codebase
- Normalize CDK before comparison

## Work Objectives

### Core Objective
Add remote CDK validation step before local format validation to ensure CDK exists in the valid list stored in GitHub Gist.

### Deliverables
1. `electron/utils/cdk-remote-validation.ts` - New module for fetching and validating CDK from Gist
2. Modified `cdk:verify` IPC handler with remote validation
3. Updated Activation page with error dialog and app quit behavior

### Definition of Done
```bash
# 1. Unit tests pass
pnpm test

# 2. Type check passes
pnpm typecheck

# 3. Lint passes
pnpm lint

# 4. Manual QA
pnpm dev
# Test: Valid CDK in Gist → Activation succeeds
# Test: Invalid CDK not in Gist → Error dialog → App quits
# Test: Network offline → Error dialog → App quits
```

### Must Have
- Fetch validCdk array from Gist URL
- Case-insensitive CDK comparison
- 10-second timeout for network request
- Error dialog before app quit
- Block activation on network failure

### Must NOT Have
- Automatic CDK deletion from Gist
- Local caching of valid CDK list
- Retry mechanism on network failure
- Server-side development

## Verification Strategy

- **Test decision**: tests-after (existing test infrastructure)
- **QA policy**: Manual testing with dev server
- **Evidence**: Screenshots of error dialog, console logs

## Execution Strategy

### Sequential Execution (dependencies exist)

```
Task 1 (Create validation module)
    ↓
Task 2 (Modify IPC handler)
    ↓
Task 3 (Update Activation page)
    ↓
Task 4 (Final verification)
```

### Dependency Matrix
| Task | Depends On | Blocks |
|------|------------|--------|
| 1. Create cdk-remote-validation.ts | None | 2, 3 |
| 2. Modify IPC handler | 1 | 3 |
| 3. Update Activation page | 1, 2 | 4 |
| 4. Final verification | 3 | None |

## TODOs

- [x] 1. Create `electron/utils/cdk-remote-validation.ts`

  **What to do**: Create a new module for fetching and validating CDK from GitHub Gist.

  **Must NOT do**: Add caching, retry logic, or automatic deletion.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: Single new file with well-defined scope
  - Skills: [] — No special skills needed
  - Omitted: [`frontend-ui-ux`] — Backend utility, no UI

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3 | Blocked By: None

  **References**:
  - Pattern: `electron/utils/proxy-fetch.ts:proxyAwareFetch` — Use for HTTP request
  - Pattern: `electron/utils/cdk-validation.ts:normalizeCdk` — Use for CDK normalization
  - Pattern: `electron/utils/cdk-validation.ts:CdkValidationResult` — Use for return type

  **Implementation Details**:
  ```typescript
  // electron/utils/cdk-remote-validation.ts
  import { proxyAwareFetch } from './proxy-fetch';
  import { normalizeCdk } from './cdk-validation';

  const GIST_URL = 'https://gist.githubusercontent.com/GOD-OF-PPT/3fb44e57b7ef1e3f68863a3dbc54341c/raw/d22e4a9809bed200615e9430d0a9b8bf71f72e48/valid-cdk.json';
  const FETCH_TIMEOUT_MS = 10000;

  export interface RemoteValidationResult {
    valid: boolean;
    error?: string;
    networkError?: boolean;
  }

  export async function fetchValidCdkList(): Promise<string[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    try {
      const response = await proxyAwareFetch(GIST_URL, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return Array.isArray(data?.validCdk) ? data.validCdk : [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  export async function validateCdkRemotely(cdk: string): Promise<RemoteValidationResult> {
    try {
      console.log('[cdk-remote] Fetching valid CDK list from Gist...');
      const validList = await fetchValidCdkList();
      const normalizedInput = normalizeCdk(cdk);
      
      const found = validList.some(validCdk => 
        normalizeCdk(validCdk) === normalizedInput
      );
      
      if (!found) {
        console.log('[cdk-remote] CDK not found in valid list');
        return { valid: false, error: 'CDK not found in valid list. Please contact support.' };
      }
      
      console.log('[cdk-remote] CDK found in valid list');
      return { valid: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[cdk-remote] Network error:', message);
      return { 
        valid: false, 
        error: `Network error: ${message}. Please check your internet connection.`,
        networkError: true 
      };
    }
  }
  ```

  **Acceptance Criteria**:
  - [ ] File created at `electron/utils/cdk-remote-validation.ts`
  - [ ] Exports `fetchValidCdkList()` and `validateCdkRemotely()`
  - [ ] Uses `proxyAwareFetch` for HTTP request
  - [ ] Uses `normalizeCdk` for case-insensitive comparison
  - [ ] 10-second timeout implemented
  - [ ] Console logging with `[cdk-remote]` prefix

  **QA Scenarios**:
  ```
  Scenario: Valid CDK in Gist
    Tool: Bash
    Steps: 
      1. Add test CDK to Gist validCdk array
      2. Call validateCdkRemotely('TEST-CDK')
    Expected: { valid: true }
    Evidence: .sisyphus/evidence/task-1-valid-cdk.txt

  Scenario: Invalid CDK not in Gist
    Tool: Bash
    Steps: Call validateCdkRemotely('INVALID-CDK-NOT-IN-LIST')
    Expected: { valid: false, error: 'CDK not found in valid list...' }
    Evidence: .sisyphus/evidence/task-1-invalid-cdk.txt

  Scenario: Network timeout
    Tool: Bash
    Steps: Block gist.githubusercontent.com, call validateCdkRemotely()
    Expected: { valid: false, networkError: true }
    Evidence: .sisyphus/evidence/task-1-network-error.txt
  ```

  **Commit**: YES | Message: `feat(cdk): add remote validation from GitHub Gist` | Files: `electron/utils/cdk-remote-validation.ts`

---

- [x] 2. Modify `cdk:verify` IPC handler

  **What to do**: Add remote validation step before format validation in the `cdk:verify` IPC handler.

  **Must NOT do**: Modify format validation logic, change error messages format.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: Small modification to existing handler
  - Skills: [] — No special skills needed
  - Omitted: [`frontend-ui-ux`] — Backend only

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 3 | Blocked By: 1

  **References**:
  - Pattern: `electron/main/ipc-handlers.ts:2446-2457` — Current handler implementation
  - Import: `import { validateCdkRemotely } from '../utils/cdk-remote-validation'`

  **Implementation Details**:
  ```typescript
  // In electron/main/ipc-handlers.ts
  // Add import at top
  import { validateCdkRemotely } from '../utils/cdk-remote-validation';

  // Modify cdk:verify handler (line ~2446)
  ipcMain.handle('cdk:verify', async (_, cdk: string) => {
    // Step 1: Remote validation (NEW)
    const remoteResult = await validateCdkRemotely(cdk);
    if (!remoteResult.valid) {
      return { 
        success: false, 
        error: remoteResult.error,
        networkError: remoteResult.networkError 
      };
    }

    // Step 2: Format validation (existing)
    const validation = validateCdkFormat(cdk);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Step 3: Save (existing)
    const normalizedCdk = normalizeCdk(cdk);
    await setSetting('cdk', normalizedCdk);
    await setSetting('cdkVerified', true);

    return { success: true, cdk: normalizedCdk };
  });
  ```

  **Acceptance Criteria**:
  - [ ] Import added for `validateCdkRemotely`
  - [ ] Remote validation called before format validation
  - [ ] Returns `{ success: false, networkError: true }` on network failure
  - [ ] Existing format validation logic unchanged

  **QA Scenarios**:
  ```
  Scenario: CDK in Gist + valid format
    Tool: interactive_bash
    Steps: 
      1. pnpm dev
      2. Open dev console
      3. window.electron.ipcRenderer.invoke('cdk:verify', 'VALID-CDK-IN-GIST')
    Expected: { success: true, cdk: '...' }
    Evidence: .sisyphus/evidence/task-2-success.txt

  Scenario: CDK not in Gist
    Tool: interactive_bash
    Steps: window.electron.ipcRenderer.invoke('cdk:verify', 'INVALID-CDK')
    Expected: { success: false, error: 'CDK not found...' }
    Evidence: .sisyphus/evidence/task-2-not-found.txt

  Scenario: Network offline
    Tool: interactive_bash
    Steps: Disable network, call cdk:verify
    Expected: { success: false, networkError: true }
    Evidence: .sisyphus/evidence/task-2-offline.txt
  ```

  **Commit**: YES | Message: `feat(cdk): integrate remote validation in IPC handler` | Files: `electron/main/ipc-handlers.ts`

---

- [x] 3. Update Activation page with error dialog and quit

  **What to do**: Modify Activation page to show error dialog and quit app when CDK is invalid or network fails.

  **Must NOT do**: Remove existing success flow, change UI layout.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: Small UI modification
  - Skills: [`frontend-ui-ux`] — Dialog UI implementation
  - Omitted: [] — All skills potentially useful

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 4 | Blocked By: 1, 2

  **References**:
  - Pattern: `src/pages/Activation/index.tsx:60-100` — Current handleActivate function
  - Pattern: `src/lib/api-client.ts:invokeIpc` — IPC call pattern
  - Dialog: Use `dialog:message` IPC for native dialog, or shadcn Dialog component

  **Implementation Details**:
  ```typescript
  // In src/pages/Activation/index.tsx
  // Add to handleActivate function after line 68

  const handleActivate = async () => {
    // ... existing validation ...

    try {
      const result = await invokeIpc('cdk:verify', cdk) as { 
        success: boolean; 
        error?: string; 
        cdk?: string;
        networkError?: boolean;  // NEW field
      };
      
      if (!result.success) {
        // NEW: Show error dialog then quit for invalid CDK
        if (result.networkError) {
          // Network error - show dialog and quit
          await invokeIpc('dialog:message', {
            type: 'error',
            title: 'Activation Failed',
            message: 'Network Error',
            detail: result.error || 'Unable to verify CDK. Please check your internet connection.'
          });
        } else {
          // Invalid CDK - show dialog and quit
          await invokeIpc('dialog:message', {
            type: 'error',
            title: 'Activation Failed',
            message: 'Invalid CDK',
            detail: result.error || 'The CDK you entered is not valid. Please contact support.'
          });
        }
        
        // Quit the app
        await invokeIpc('app:quit');
        return;
      }

      // ... rest of existing success flow ...
    }
  };
  ```

  **Acceptance Criteria**:
  - [ ] Error dialog shown when `success: false`
  - [ ] Different messages for network error vs invalid CDK
  - [ ] App quits after dialog dismiss
  - [ ] Success flow unchanged

  **QA Scenarios**:
  ```
  Scenario: Invalid CDK entered
    Tool: Playwright / Manual
    Steps:
      1. pnpm dev
      2. Enter CDK not in Gist
      3. Click Activate
    Expected: Error dialog appears → Click OK → App closes
    Evidence: .sisyphus/evidence/task-3-invalid.png

  Scenario: Network offline
    Tool: Playwright / Manual
    Steps:
      1. Disable network
      2. Enter any CDK
      3. Click Activate
    Expected: Network error dialog → Click OK → App closes
    Evidence: .sisyphus/evidence/task-3-offline.png

  Scenario: Valid CDK
    Tool: Playwright / Manual
    Steps:
      1. Add CDK to Gist
      2. Enter valid CDK
      3. Click Activate
    Expected: Success animation → Navigate to main page
    Evidence: .sisyphus/evidence/task-3-success.png
  ```

  **Commit**: YES | Message: `feat(activation): add error dialog and quit on invalid CDK` | Files: `src/pages/Activation/index.tsx`

---

- [x] 4. Final Verification

  **What to do**: Run all tests, type checks, and manual QA to verify complete implementation.

  **Must NOT do**: Skip any verification step.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: Verification tasks
  - Skills: [] — No special skills needed
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: None | Blocked By: 3

  **References**: None

  **Acceptance Criteria**:
  - [ ] `pnpm test` passes
  - [ ] `pnpm typecheck` passes
  - [ ] `pnpm lint` passes
  - [ ] Manual test: Valid CDK → Success
  - [ ] Manual test: Invalid CDK → Error dialog → Quit
  - [ ] Manual test: Network offline → Error dialog → Quit

  **QA Scenarios**:
  ```
  Scenario: Full test suite
    Tool: Bash
    Steps: pnpm test && pnpm typecheck && pnpm lint
    Expected: All pass
    Evidence: .sisyphus/evidence/task-4-tests.txt

  Scenario: End-to-end activation flow
    Tool: Manual
    Steps:
      1. Add test CDK to Gist: TEST-CDK-FORM-AT11
      2. pnpm dev
      3. Enter TEST-CDK-FORM-AT11
      4. Verify activation succeeds
      5. Delete config file
      6. Restart app
      7. Enter INVALID-CDK
      8. Verify error dialog and quit
    Expected: All scenarios work as expected
    Evidence: .sisyphus/evidence/task-4-e2e.png
  ```

  **Commit**: NO — Verification only

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
1. Task 1: `feat(cdk): add remote validation from GitHub Gist`
2. Task 2: `feat(cdk): integrate remote validation in IPC handler`
3. Task 3: `feat(activation): add error dialog and quit on invalid CDK`

## Success Criteria
- CDK validation checks Gist before format validation
- Invalid CDK shows error dialog then quits app
- Network failure shows error dialog then quits app
- Valid CDK proceeds with existing activation flow
- All tests pass, typecheck passes, lint passes