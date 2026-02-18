# Cursor Position Update Issue - Debug Changes

## Problem Summary
The host is not receiving cursor position updates from collaborators correctly. While the collaborator receives updates from the host with `oct_` prefixed peer IDs, the host's console logs show it's not receiving updates from collaborators through the RPC handler's awareness listeners.

## Root Cause Analysis
The issue appears to be that the `onWebviewStateChanged` listeners in the Ballerina extension's RPC handler are not firing when collaborators update their presence. This could be due to:

1. **Timing Issue**: Listeners might be set up before the OCT collaboration instance is fully initialized
2. **State Key Issue**: The custom awareness state key ('ballerina.diagram.presence') might not be properly synchronized
3. **Garbage Collection**: Listener disposables weren't being kept alive

## Changes Made

### 1. OCT Extension (`open-collaboration-vscode`)
**File**: `packages/open-collaboration-vscode/src/extension.ts`

Added comprehensive debug logging to the `onWebviewStateChanged` method to track:
- When awareness change events fire
- Which client IDs are added/updated
- What state keys exist for each client
- Whether the requested key exists in the state
- When callbacks are invoked

### 2. Ballerina Extension
**File**: `workspaces/ballerina/ballerina-extension/src/rpc-managers/collaboration/rpc-handler.ts`

Made the following changes:
- Added `listenerDisposables` array to keep references and prevent garbage collection
- Added check for collaboration instance existence before setting up listeners
- Added retry mechanism with 1-second delay if instance isn't available
- Added cleanup of old listeners before setting up new ones
- Added logging to track listener disposable creation

## Testing Instructions

### Step 1: Rebuild OCT Extension
```bash
cd /Users/vinuka/projects/open-collaboration-tools/packages/open-collaboration-vscode
pnpm install
pnpm run build
```

### Step 2: Rebuild Ballerina Extension
```bash
cd /Users/vinuka/projects/vscode-extensions
rush build
```

### Step 3: Test the Changes
1. Start Extension Development Host (F5)
2. Host starts a collaboration session
3. Collaborator joins the session
4. Open the same Ballerina diagram file on both sides
5. Move cursor on COLLABORATOR's side
6. Check HOST's Debug Console for these new logs:

**Expected logs on HOST when collaborator moves cursor:**
```
[OCT API] Awareness change for key 'ballerina.diagram.presence': added=[...], updated=[<collaborator_client_id>], removed=[]
[OCT API] Total states in awareness: 2
[OCT API] Client <collaborator_client_id> state keys: peer, user, ballerina.diagram.presence, ...
[OCT API] Has key 'ballerina.diagram.presence': true
[OCT API] Calling callback for client <collaborator_client_id> with state: {...}
[OCT Integration] ===== PRESENCE LISTENER FIRED =====
[OCT Integration] Peer ID: <collaborator_client_id>, Own ID: <host_client_id>
[OCT Integration] Received presence from peer <collaborator_client_id>: {...}
[Collaboration] Updated presence data: {"peerId":"oct_<collaborator_client_id>",...}
[OCT] Broadcasting presence data to webview: {...}
```

### Step 4: Diagnose Issues

If you still don't see the presence listener firing:

**Check 1: Collaboration Instance**
Look for:
```
[OCT Integration] ❌ No collaboration instance available - listeners cannot be set up
[OCT Integration] Will retry after delay...
```
This means the instance wasn't ready when listeners were set up.

**Check 2: State Keys**
Look for:
```
[OCT API] Client X state keys: peer, user, ...
[OCT API] Has key 'ballerina.diagram.presence': false
```
This means the collaborator's state doesn't have the custom key.

**Check 3: Own Updates Being Filtered**
Look for:
```
[OCT Integration] Ignoring own presence update from client X
```
If you see this for the collaborator's client ID, it means `ownClientId` is incorrectly set.

## Additional Debugging

If the issue persists, add this code to check the awareness state manually:

```typescript
// In rpc-handler.ts, after setupOctListeners()
setTimeout(() => {
    const awareness = octApi?.getCollaborationInstance()?.yjsAwareness;
    if (awareness) {
        const states = awareness.getStates();
        debug(`[OCT Debug] All awareness states:`);
        states.forEach((state, clientId) => {
            debug(`  Client ${clientId}:`, JSON.stringify(Object.keys(state)));
        });
    }
}, 5000);
```

## Next Steps

1. Test with the new logging to see where the flow breaks
2. Share the complete console output from both host and collaborator
3. Based on the logs, we can determine if:
   - The awareness state is missing the custom key
   - The listener is not being set up properly
   - There's a YJS synchronization issue
   - The timing of listener setup is the problem

## Rollback

If these changes cause issues, revert using:
```bash
cd /Users/vinuka/projects/open-collaboration-tools/packages/open-collaboration-vscode
git checkout src/extension.ts

cd /Users/vinuka/projects/vscode-extensions/workspaces/ballerina/ballerina-extension
git checkout src/rpc-managers/collaboration/rpc-handler.ts
```
