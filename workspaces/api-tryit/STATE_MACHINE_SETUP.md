# API TryIt State Machine Setup

This document explains the state machine implementation for API TryIt extension, modeled after the MI extension's approach.

## Overview

The implementation follows the same pattern as the MI extension, using XState for state management and VS Code's EventEmitter for communication between the extension and webview.

## Architecture

### 1. State Machine (`stateMachine.ts`)

Located at: `/workspaces/api-tryit/api-tryit-extension/src/stateMachine.ts`

**Key Components:**
- **Event Types**: `API_ITEM_SELECTED`, `WEBVIEW_READY`
- **Context Interface**: Tracks selected API item and webview readiness state
- **States**: `idle`, `ready`, `itemSelected`
- **Event Emitter**: `apiSelectionEmitter` - broadcasts API selection events to webview

**State Flow:**
```
idle -> (WEBVIEW_READY) -> ready
idle -> (API_ITEM_SELECTED) -> itemSelected
ready -> (API_ITEM_SELECTED) -> itemSelected
itemSelected -> (API_ITEM_SELECTED) -> itemSelected (update)
```

### 2. Extension Integration (`extension.ts`)

**Changes:**
- Imported `ApiTryItStateMachine` and `EVENT_TYPE`
- Updated `api-tryit.openRequest` command to send API selection events
- State machine captures item details (label, method, type, url) and broadcasts them

**Example:**
```typescript
ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, {
    label: item.label,
    method: item.method,
    type: item.type,
    url: `https://api.example.com/${item.label.toLowerCase().replace(/\s+/g, '-')}`
});
```

### 3. WebView Panel (`TryItPanel.ts`)

**Changes:**
- Listens for webview messages (e.g., `webviewReady`)
- Subscribes to `apiSelectionEmitter` 
- Posts API selection messages to webview using `postMessage`

**Message Flow:**
```
Extension -> apiSelectionEmitter.fire() -> TryItPanel listener -> webview.postMessage()
```

### 4. React UI (`EditorPanelUI.tsx`)

**Changes:**
- Added `useEffect` hook to listen for VS Code messages
- Uses `acquireVsCodeApi()` to get VS Code API instance
- Notifies extension when webview is ready
- Handles `apiItemSelected` messages and updates UI state

**State Updates:**
- Updates `url` and `method` based on selected API item
- Displays selected item name in header
- Stores full item data in `selectedItem` state

## Message Flow Diagram

```
User clicks API item in Explorer
    ↓
ApiExplorerProvider triggers command
    ↓
extension.ts: api-tryit.openRequest command
    ↓
ApiTryItStateMachine.sendEvent(API_ITEM_SELECTED, data)
    ↓
apiSelectionEmitter.fire(data)
    ↓
TryItPanel receives event
    ↓
TryItPanel.postMessage({type: 'apiItemSelected', data})
    ↓
EditorPanelUI receives message via window.addEventListener
    ↓
EditorPanelUI updates state and UI
```

## Dependencies Added

Added to `package.json`:
```json
"xstate": "^4.38.3"
```

## Testing

To test the implementation:

1. Run `pnpm install` in the api-tryit-extension directory to install xstate
2. Open the API Explorer tree view
3. Click on any API request item (e.g., "Add Pet", "Get Pet by ID")
4. The TryIt panel should open and display:
   - Selected item name in the header
   - URL and HTTP method populated in the form
   - Console log showing the selected item data

## Similar Pattern to MI Extension

This implementation follows the exact same patterns as MI extension:
- Uses XState for state management
- Uses VS Code EventEmitter for internal pub/sub
- Posts messages to webview using `postMessage`
- Webview listens using `window.addEventListener('message')`
- Notifies extension when webview is ready

## Future Enhancements

Potential improvements:
1. Add request history tracking
2. Store request configurations in workspace state
3. Implement request/response caching
4. Add support for environment variables
5. Track multiple request states simultaneously
