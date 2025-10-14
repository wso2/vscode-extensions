# MI Copilot Refactoring Summary

## Overview
This refactoring moves MI Copilot logic (prompts, AI service calls) from the backend to the VSCode extension, following the pattern established by Ballerina (BI) Copilot. The changes enable support for two authentication methods: MI Intel (SSO) and Anthropic API Key. AWS Bedrock support can be added in a future iteration once the core functionality is stable.

## Key Changes

### 1. State Machine Types (`workspaces/mi/mi-core/src/state-machine-types.ts`)

#### Added New Types:
- **`AIMachineStateValue`**: Updated to support hierarchical authentication states
  - `Initialize`: Checking authentication status
  - `Unauthenticated`: Show login window
  - `Authenticating`: Hierarchical state with substates:
    - `determineFlow`: Route to appropriate auth flow
    - `ssoFlow`: MI Intel SSO authentication
    - `apiKeyFlow`: Anthropic API key input
    - `validatingApiKey`: Validating API key
  - `Authenticated`: Ready state with active session
  - `Disabled`: Extension disabled
  - `NotSupported`: Multi-root workspace not supported

- **`AI_EVENT_TYPE`**: Extended with new authentication events
  - `CHECK_AUTH`, `AUTH_WITH_API_KEY`, `SUBMIT_API_KEY`
  - `COMPLETE_AUTH`, `CANCEL_LOGIN`, `SILENT_LOGOUT`

- **`LoginMethod` enum**:
  - `MI_INTEL`: WSO2 SSO authentication
  - `ANTHROPIC_KEY`: Direct Anthropic API key

- **`AuthCredentials` type**: Discriminated union for storing credentials
  - Different secret structures for each login method
  - Type-safe credential management

- **`AIMachineContext`**: State machine context
  - `loginMethod`: Current authentication method
  - `userToken`: Active token information
  - `errorMessage`: Error state tracking

- **`AIMachineEventMap` and `AIMachineSendableEvent`**: Type-safe event handling

### 2. Connection Service (`workspaces/mi/mi-extension/src/ai-panel/copilot/connection.ts`)

New file providing AI service connections:

- **`getAnthropicClient(model)`**: Returns appropriate Anthropic client based on login method
  - MI Intel: Uses backend proxy with token auth
  - Anthropic Key: Direct API connection

- **`fetchWithAuth()`**: Handles authenticated requests with automatic token refresh

- **`getProviderCacheControl()`**: Cache control settings for Anthropic

### 3. Authentication Utilities (`workspaces/mi/mi-extension/src/ai-panel/utils/auth.ts`)

New authentication management utilities:

- **Credential Storage**:
  - `storeAuthCredentials()`: Store credentials securely
  - `getAuthCredentials()`: Retrieve stored credentials
  - `clearAuthCredentials()`: Clear credentials on logout

- **Token Management**:
  - `getAccessToken()`: Get current access token with auto-refresh
  - `getRefreshedAccessToken()`: Refresh MI Intel tokens
  - `getLoginMethod()`: Get current login method

- **Legacy Migration**:
  - `cleanupLegacyTokens()`: Remove old token storage format

### 4. State Machine Services (`workspaces/mi/mi-extension/src/ai-panel/utils.ts`)

New file with state machine service implementations:

- **`checkToken()`**: Verify existing authentication
- **`logout(isUserLogout)`**: Handle logout (with/without SSO redirect)
- **`initiateInbuiltAuth()`**: Start SSO authentication flow
- **`validateApiKey(apiKey, loginMethod)`**: Validate Anthropic API key

### 5. Updated AI State Machine (`workspaces/mi/mi-extension/src/ai-panel/aiMachine.ts`)

Complete rewrite following Ballerina's pattern:

- **Hierarchical State Structure**:
  - Proper state transitions for each auth method
  - Error handling with automatic retry/logout
  - Workspace validation before authentication

- **Service Integration**:
  - `checkWorkspaceAndToken`: Combined workspace and token check
  - `validateApiKey`: API key validation service
  - `getTokenAfterAuth`: Retrieve token after successful auth

- **Type-Safe Event Handling**:
  - Support for events with payloads (API key, AWS credentials)
  - Discriminated union for event types

### 6. Updated Login Screen (`workspaces/mi/mi-visualizer/src/views/LoggedOutWindow/index.tsx`)

Enhanced login UI with multiple authentication options:

- **New UI Elements**:
  - "Login to MI Copilot" button (SSO)
  - "Enter your Anthropic API key" link
  - Divider between options

- **Event Handlers**:
  - `handleAnthropicKeyClick()`: Trigger API key flow

### 7. Simplified Chat Header (`workspaces/mi/mi-visualizer/src/views/AIPanel/component/AIChatHeader.tsx`)

Removed custom API key functionality:

- **Removed**:
  - API key setup button
  - API key status badge
  - `hasApiKey` state management
  - `checkApiKey()` function
  - `handleSetApiKey()` function

- **Kept**:
  - Clear chat button
  - Logout button

### 8. Updated Auth Module (`workspaces/mi/mi-extension/src/ai-panel/auth.ts`)

Updated to use new credential structure:

- Added `getLogoutUrl()` function
- Updated `exchangeAuthCode()` to use new `AuthCredentials` format
- Stores credentials via `storeAuthCredentials()`

### 9. Package Dependencies (`workspaces/mi/mi-extension/package.json`)

Added new dependencies:

```json
"@ai-sdk/anthropic": "^1.2.12",
"ai": "^4.3.16",
"jwt-decode": "^4.0.0"
```

## Migration Path

### For Users:

1. **Existing MI Intel Users**: 
   - Tokens will be migrated to new format on first launch
   - No action required

2. **API Key Users**:
   - Previous custom API key functionality removed from header
   - Must set API key via login screen
   - Re-authenticate on next login

### For Developers:

1. **Install Dependencies**: Run `rush update` or package manager to install new dependencies
2. **Build**: Rebuild the extension
3. **Test**: Verify all authentication flows work correctly

## Benefits

1. **Consistency**: Matches Ballerina's proven authentication architecture
2. **Flexibility**: Support for multiple AI providers (API key and SSO)
3. **Type Safety**: Full TypeScript type coverage for auth flows
4. **Future-Ready**: Easy to add new authentication methods (AWS Bedrock can be added later)
5. **Better UX**: Unified login experience
6. **Simplified Implementation**: Focus on core functionality first
7. **Local Processing**: AI logic runs in extension (future implementation)

## Future Work

1. Implement AI prompt logic in extension (currently in backend)
2. Add input form for API key in visualizer
3. Migrate existing backend AI logic to extension
4. Add settings panel similar to Ballerina for managing auth
5. Token usage tracking for custom API keys
6. Support for custom model selection
7. Add AWS Bedrock support (deferred to future release)

## Files Modified

### Core Types:
- `workspaces/mi/mi-core/src/state-machine-types.ts`

### Extension Backend:
- `workspaces/mi/mi-extension/src/ai-panel/aiMachine.ts` (complete rewrite)
- `workspaces/mi/mi-extension/src/ai-panel/auth.ts` (updated)
- `workspaces/mi/mi-extension/src/ai-panel/copilot/connection.ts` (new)
- `workspaces/mi/mi-extension/src/ai-panel/utils.ts` (new)
- `workspaces/mi/mi-extension/src/ai-panel/utils/auth.ts` (new)
- `workspaces/mi/mi-extension/package.json` (dependencies added)

### Visualizer Frontend:
- `workspaces/mi/mi-visualizer/src/views/LoggedOutWindow/index.tsx` (updated)
- `workspaces/mi/mi-visualizer/src/views/AIPanel/component/AIChatHeader.tsx` (simplified)

## Testing Checklist

- [ ] MI Intel SSO login flow
- [ ] Anthropic API key login flow
- [ ] Token refresh for MI Intel
- [ ] Logout from each auth method
- [ ] Multi-root workspace handling
- [ ] Error handling for invalid credentials
- [ ] Legacy token migration
- [ ] State persistence across extension reloads
- [ ] API key validation with valid/invalid keys

