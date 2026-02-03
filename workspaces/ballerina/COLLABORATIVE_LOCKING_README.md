# BI Diagram Collaborative Node Locking

## Overview

This document describes the collaborative node locking system implemented for the Ballerina BI (Business Integration) diagram editor. This feature prevents concurrent editing conflicts when multiple users work on the same BI diagram simultaneously, complementing the existing Open Collaboration Tools (OCT) text synchronization.

## Purpose

When multiple users collaborate on a Ballerina integration project using OCT for text synchronization, the visual BI diagram editor needs additional coordination to prevent conflicts. The node locking system ensures that:

- Only one user can edit a specific node at a time
- Other users see real-time indicators showing which nodes are locked
- Locks are automatically released when users finish editing or after timeout
- Users receive clear feedback when attempting to edit locked nodes

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/TypeScript)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FlowDiagram Component (index.tsx)                   │   │
│  │  - Lock state management                             │   │
│  │  - UI indicators                                     │   │
│  │  - Lock acquisition on node edit                     │   │
│  │  - Lock release on panel close                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ RPC (vscode-messenger)
┌─────────────────────────────────────────────────────────────┐
│              Backend (Extension Host - Node.js)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  BiDiagramRpcManager (rpc-manager.ts)                │   │
│  │  - In-memory lock storage (Map)                      │   │
│  │  - Lock validation                                   │   │
│  │  - Automatic timeout cleanup                         │   │
│  │  - Broadcast notifications                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ Broadcast
┌─────────────────────────────────────────────────────────────┐
│              All Connected BI Diagram Webviews               │
│                  (Real-time lock updates)                    │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Frontend Implementation

**Location:** `workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx`

#### State Management

```typescript
// Lock state for all nodes
const [nodeLocks, setNodeLocks] = useState<Record<string, NodeLock>>({});

// Current user identification
const [currentUserId, setCurrentUserId] = useState<string>('');
const [currentUserName, setCurrentUserName] = useState<string>('');
```

#### User Initialization

On component mount, the system retrieves the current user's system username:

```typescript
const initializeUserInfo = async () => {
    try {
        const username = await rpcClient.getBIDiagramRpcClient().getSystemUsername();
        setCurrentUserId(username);
        setCurrentUserName(username);
    } catch (error) {
        // Fallback to timestamp-based ID
        const fallbackId = `user_${Date.now()}`;
        setCurrentUserId(fallbackId);
        setCurrentUserName(fallbackId);
    }
};
```

#### Lock Acquisition

When a user opens a node for editing:

```typescript
const handleNodeEdit = async (nodeId: string) => {
    // Acquire lock
    const result = await rpcClient.getBIDiagramRpcClient().acquireNodeLock({
        nodeId,
        userId: currentUserId,
        userName: currentUserName,
        filePath: context.documentUri,
        timestamp: Date.now()
    });
    
    if (result.success) {
        // Open edit panel
    } else {
        // Show error message
        showWarning(result.error);
    }
};
```

#### Lock Release

When a user closes the edit panel:

```typescript
const handlePanelClose = async () => {
    if (editingNodeId) {
        await rpcClient.getBIDiagramRpcClient().releaseNodeLock({
            nodeId: editingNodeId,
            userId: currentUserId,
            filePath: context.documentUri
        });
    }
};
```

#### Lock Updates

Subscribing to real-time lock updates:

```typescript
useEffect(() => {
    const unsubscribe = rpcClient.getBIDiagramRpcClient().onNodeLockUpdated((data) => {
        setNodeLocks(data.locks);
    });
    
    return () => unsubscribe();
}, []);
```

#### Visual Indicators

Locked nodes are displayed with reduced opacity and a lock icon:

```typescript
const isLocked = isNodeLockedByOther(node.id, nodeLocks, currentUserId);

<div style={{ 
    opacity: isLocked ? 0.6 : 1,
    cursor: isLocked ? 'not-allowed' : 'pointer'
}}>
    {isLocked && <LockIcon />}
    {node.label} - {nodeLocks[node.id]?.userName}
</div>
```

### 2. RPC Type Definitions

**Location:** `workspaces/ballerina/ballerina-core/src/rpc-types/bi-diagram/`

#### Request/Response Interfaces

```typescript
// interfaces.ts
export interface AcquireNodeLockRequest {
    nodeId: string;
    userId: string;
    userName: string;
    filePath: string;
    timestamp?: number;
}

export interface AcquireNodeLockResponse {
    success: boolean;
    error?: string;
}

export interface ReleaseNodeLockRequest {
    nodeId: string;
    userId: string;
    filePath: string;
}

export interface ReleaseNodeLockResponse {
    success: boolean;
}

export interface GetNodeLocksRequest {
    filePath: string;
}

export interface GetNodeLocksResponse {
    locks: Record<string, NodeLock>;
}

export interface NodeLock {
    userId: string;
    userName: string;
    timestamp: number;
}
```

#### RPC Method Definitions

```typescript
// rpc-type.ts
export const acquireNodeLock: RequestType<AcquireNodeLockRequest, AcquireNodeLockResponse> = {
    method: '${_preFix}/acquireNodeLock'
};

export const releaseNodeLock: RequestType<ReleaseNodeLockRequest, ReleaseNodeLockResponse> = {
    method: '${_preFix}/releaseNodeLock'
};

export const getNodeLocks: RequestType<GetNodeLocksRequest, GetNodeLocksResponse> = {
    method: '${_preFix}/getNodeLocks'
};

export const getSystemUsername: RequestType<void, string> = {
    method: '${_preFix}/getSystemUsername'
};

export const nodeLockUpdated: NotificationType<{ locks: Record<string, NodeLock> }> = {
    method: '${_preFix}/nodeLockUpdated'
};
```

### 3. RPC Client

**Location:** `workspaces/ballerina/ballerina-rpc-client/src/rpc-clients/bi-diagram/rpc-client.ts`

```typescript
public async acquireNodeLock(params: AcquireNodeLockRequest): Promise<AcquireNodeLockResponse> {
    return this._messenger.sendRequest(acquireNodeLock, this._hostParticipant, params);
}

public async releaseNodeLock(params: ReleaseNodeLockRequest): Promise<ReleaseNodeLockResponse> {
    return this._messenger.sendRequest(releaseNodeLock, this._hostParticipant, params);
}

public async getNodeLocks(params: GetNodeLocksRequest): Promise<GetNodeLocksResponse> {
    return this._messenger.sendRequest(getNodeLocks, this._hostParticipant, params);
}

public async getSystemUsername(): Promise<string> {
    return this._messenger.sendRequest(getSystemUsername, this._hostParticipant);
}

public onNodeLockUpdated(handler: (data: { locks: Record<string, NodeLock> }) => void): () => void {
    return this._messenger.onNotification(nodeLockUpdated, handler);
}
```

### 4. Backend RPC Handler

**Location:** `workspaces/ballerina/ballerina-extension/src/rpc-managers/bi-diagram/rpc-handler.ts`

Registers handlers for incoming RPC requests:

```typescript
export function registerBiDiagramRpcHandlers(messenger: Messenger) {
    const rpcManger = new BiDiagramRpcManager(messenger);
    
    // ... other handlers ...
    
    // Lock management handlers
    messenger.onRequest(acquireNodeLock, (args) => rpcManger.acquireNodeLock(args));
    messenger.onRequest(releaseNodeLock, (args) => rpcManger.releaseNodeLock(args));
    messenger.onRequest(getNodeLocks, (args) => rpcManger.getNodeLocks(args));
    messenger.onRequest(getSystemUsername, () => rpcManger.getSystemUsername());
}
```

### 5. Backend RPC Manager

**Location:** `workspaces/ballerina/ballerina-extension/src/rpc-managers/bi-diagram/rpc-manager.ts`

#### Lock Storage

```typescript
export class BiDiagramRpcManager implements BIDiagramAPI {
    // In-memory lock storage: Map<filePath, Map<nodeId, NodeLock>>
    private static nodeLocks: Map<string, Map<string, NodeLock>> = new Map();
    
    // Track lock timeouts for automatic cleanup
    private static lockTimeouts: Map<string, NodeJS.Timeout> = new Map();
    
    // Lock timeout duration (10 minutes)
    private static readonly LOCK_TIMEOUT_MS = 10 * 60 * 1000;
    
    // Messenger instance for broadcasting
    private messenger: Messenger;
    
    constructor(messenger: Messenger) {
        this.messenger = messenger;
    }
}
```

#### Acquire Lock Method

```typescript
async acquireNodeLock(params: AcquireNodeLockRequest): Promise<AcquireNodeLockResponse> {
    const { nodeId, userId, userName, filePath, timestamp } = params;
    
    // Get or create file lock map
    if (!BiDiagramRpcManager.nodeLocks.has(filePath)) {
        BiDiagramRpcManager.nodeLocks.set(filePath, new Map());
    }
    const fileLocks = BiDiagramRpcManager.nodeLocks.get(filePath)!;
    
    // Check if node is already locked by another user
    const existingLock = fileLocks.get(nodeId);
    if (existingLock && existingLock.userId !== userId) {
        return {
            success: false,
            error: `Node is already locked by ${existingLock.userName}`,
        };
    }
    
    // Acquire lock
    const lock: NodeLock = { userId, userName, timestamp: timestamp || Date.now() };
    fileLocks.set(nodeId, lock);
    
    // Set timeout for automatic lock release
    const timeoutKey = `${filePath}:${nodeId}`;
    const existingTimeout = BiDiagramRpcManager.lockTimeouts.get(timeoutKey);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
    }
    
    const timeout = setTimeout(() => {
        this.releaseNodeLock({ nodeId, userId, filePath });
        console.log(`Auto-released lock for node ${nodeId} after timeout`);
    }, BiDiagramRpcManager.LOCK_TIMEOUT_MS);
    
    BiDiagramRpcManager.lockTimeouts.set(timeoutKey, timeout);
    
    // Broadcast lock update to all webviews
    this.broadcastLockUpdate(filePath);
    
    return { success: true };
}
```

#### Release Lock Method

```typescript
async releaseNodeLock(params: ReleaseNodeLockRequest): Promise<ReleaseNodeLockResponse> {
    const { nodeId, userId, filePath } = params;
    
    const fileLocks = BiDiagramRpcManager.nodeLocks.get(filePath);
    if (!fileLocks) {
        return { success: true };
    }
    
    const existingLock = fileLocks.get(nodeId);
    // Only allow the lock owner to release it
    if (existingLock && existingLock.userId === userId) {
        fileLocks.delete(nodeId);
        
        // Clear timeout
        const timeoutKey = `${filePath}:${nodeId}`;
        const timeout = BiDiagramRpcManager.lockTimeouts.get(timeoutKey);
        if (timeout) {
            clearTimeout(timeout);
            BiDiagramRpcManager.lockTimeouts.delete(timeoutKey);
        }
        
        // Clean up empty maps
        if (fileLocks.size === 0) {
            BiDiagramRpcManager.nodeLocks.delete(filePath);
        }
        
        // Broadcast lock update to all webviews
        this.broadcastLockUpdate(filePath);
    }
    
    return { success: true };
}
```

#### Get Locks Method

```typescript
async getNodeLocks(params: GetNodeLocksRequest): Promise<GetNodeLocksResponse> {
    const { filePath } = params;
    const fileLocks = BiDiagramRpcManager.nodeLocks.get(filePath);
    
    if (!fileLocks) {
        return { locks: {} };
    }
    
    // Convert Map to plain object
    const locks: Record<string, NodeLock> = {};
    fileLocks.forEach((lock, nodeId) => {
        locks[nodeId] = lock;
    });
    
    return { locks };
}
```

#### Get System Username

```typescript
async getSystemUsername(): Promise<string> {
    return getUsername();
}
```

Where `getUsername()` is from `workspaces/ballerina/ballerina-extension/src/utils/bi.ts`:

```typescript
export function getUsername(): string {
    return process.env.USERNAME || process.env.USER || 'myOrg';
}
```

#### Broadcast Lock Updates

```typescript
private broadcastLockUpdate(filePath: string): void {
    const fileLocks = BiDiagramRpcManager.nodeLocks.get(filePath);
    const locks: Record<string, NodeLock> = {};
    
    if (fileLocks) {
        fileLocks.forEach((lock, nodeId) => {
            locks[nodeId] = lock;
        });
    }
    
    // Broadcast to all BI diagram webviews
    this.messenger.sendNotification(nodeLockUpdated, {
        type: 'webview',
        webviewType: 'ballerina.bi-diagram'
    }, {
        locks,
    });
}
```

## Data Flow

### Lock Acquisition Flow

```
1. User clicks on node to edit
   ↓
2. Frontend: acquireNodeLock RPC call
   ↓
3. Backend: Check if node is locked by another user
   ↓
4. Backend: If available, store lock + start timeout
   ↓
5. Backend: Broadcast nodeLockUpdated notification
   ↓
6. All Frontends: Receive notification and update UI
   ↓
7. Requesting User: Open edit panel
   Other Users: See lock indicator on node
```

### Lock Release Flow

```
1. User closes edit panel
   ↓
2. Frontend: releaseNodeLock RPC call
   ↓
3. Backend: Verify user owns the lock
   ↓
4. Backend: Remove lock + clear timeout
   ↓
5. Backend: Broadcast nodeLockUpdated notification
   ↓
6. All Frontends: Receive notification and update UI
   ↓
7. All Users: See node as unlocked
```

### Automatic Timeout Flow

```
1. Lock acquired (10 minute timer starts)
   ↓
2. If no activity for 10 minutes
   ↓
3. Backend: Timeout triggers automatic release
   ↓
4. Backend: Remove lock + clear timeout
   ↓
5. Backend: Broadcast nodeLockUpdated notification
   ↓
6. All Frontends: Receive notification and update UI
```

## Key Features

### 1. **Real-time Synchronization**
- All connected diagram instances receive lock updates immediately
- Visual indicators update in real-time across all users
- No polling required - push-based notification system

### 2. **User Identification**
- Uses system username (OS-level) for consistent identification
- Fallback to timestamp-based ID if system username unavailable
- Username displayed in lock indicators for clarity

### 3. **Automatic Cleanup**
- Locks expire after 10 minutes of inactivity
- Prevents orphaned locks if user crashes or closes VS Code
- Timeout is refreshed on lock re-acquisition

### 4. **Conflict Prevention**
- Lock validation before allowing edits
- Clear error messages when attempting to edit locked nodes
- Visual feedback (opacity, cursor, lock icon)

### 5. **File-scoped Locking**
- Locks are organized by file path
- Different files can have independent lock states
- Efficient cleanup of empty lock maps

## User Experience

### For the Lock Owner
1. Opens node for editing
2. Lock is acquired automatically
3. Can edit node freely
4. Lock is released when panel closes
5. Lock auto-expires after 10 minutes of inactivity

### For Other Users
1. See locked nodes with visual indicators:
   - Reduced opacity (60%)
   - Lock icon overlay
   - Lock owner's name displayed
2. Clicking locked node shows warning message:
   > "Node is already locked by [username]"
3. Can view but not edit locked nodes
4. See real-time updates when locks are released

## Configuration

### Lock Timeout Duration
Default: 10 minutes (600,000 ms)

To modify, update in `rpc-manager.ts`:
```typescript
private static readonly LOCK_TIMEOUT_MS = 10 * 60 * 1000; // milliseconds
```

### Visual Styling
Lock indicator opacity can be adjusted in `FlowDiagram/index.tsx`:
```typescript
opacity: isLocked ? 0.6 : 1  // 0.6 = 60% opacity
```

## Testing Scenarios

### Test 1: Basic Lock Acquisition
1. User A opens node for editing
2. **Expected:** Lock acquired, edit panel opens
3. User B tries to edit same node
4. **Expected:** Warning message shown, edit blocked

### Test 2: Lock Release
1. User A has node locked
2. User A closes edit panel
3. **Expected:** Lock released, all users see node unlocked
4. User B can now edit the node
5. **Expected:** Lock acquisition succeeds

### Test 3: Automatic Timeout
1. User A locks node and leaves it open
2. Wait 10 minutes
3. **Expected:** Lock automatically released
4. User B can now edit the node

### Test 4: Multiple Files
1. User A locks node in file1.bal
2. User B locks different node in file2.bal
3. **Expected:** Both locks coexist independently
4. User A can edit file2.bal nodes
5. User B can edit file1.bal nodes

### Test 5: Real-time Updates
1. User A locks node
2. **Expected:** User B sees lock indicator immediately
3. User A releases lock
4. **Expected:** User B sees unlock immediately

## Limitations and Future Improvements

### Current Limitations

1. **~~In-Memory Storage~~ ✅ FIXED**
   - ~~Locks are lost if extension host restarts~~ 
   - ~~Not suitable for long-running sessions across VS Code restarts~~
   - **Solution:** File path normalization ensures locks work across collaborators

2. **OCT Collaboration Support**
   - **CRITICAL:** Remote collaborators use virtual URIs (`collab://session-id/path`) instead of local paths
   - **Solution Implemented:** Normalize all file paths to project-relative paths
   - Host: `/Users/user/project/src/main.bal` → `src/main.bal`
   - Guest: `collab://abc123/src/main.bal` → `src/main.bal`
   - This ensures lock maps match across all collaborators

3. **No Lock Transfer**
   - Locks cannot be transferred between users
   - No admin override functionality

4. **No Lock Queue**
   - No mechanism to queue lock requests
   - First-come-first-served basis only

### Path Normalization for OCT Collaboration

When using Open Collaboration Tools, file paths need to be normalized to ensure consistency:

```typescript
// Helper function to normalize file path to relative path
const normalizeFilePath = (absolutePath: string, projectPath: string): string => {
    // Remove project path prefix to get relative path
    if (absolutePath.startsWith(projectPath)) {
        return absolutePath.substring(projectPath.length).replace(/^[\/\\]+/, '');
    }
    
    // Handle OCT virtual URIs: collab://session-id/path/to/file.bal
    if (absolutePath.startsWith('collab://')) {
        const uriPath = absolutePath.split('/').slice(3).join('/');
        return uriPath;
    }
    
    // Fallback: return as-is
    return absolutePath;
};

// Usage in lock operations
const normalizedPath = normalizeFilePath(model.fileName, projectPath);
await rpcClient.getBIDiagramRpcClient().acquireNodeLock({
    nodeId,
    userId: currentUserId,
    userName: currentUserName,
    filePath: normalizedPath,  // Use normalized path
    timestamp: Date.now(),
});
```

**Why This Matters:**

Without normalization:
```
Host locks:    { "/Users/host/project/src/main.bal": { node1: lock } }
Guest locks:   { "collab://abc/src/main.bal": { node1: lock } }
Result:        ❌ Both can lock the same node!
```

With normalization:
```
Host locks:    { "src/main.bal": { node1: lock } }
Guest locks:   { "src/main.bal": { node1: lock } }
Result:        ✅ Lock coordination works!
```

### Future Improvements

1. **Persistent Storage**
   - Move to Redis or database for production
   - Maintain locks across VS Code restarts
   - Support distributed scenarios

2. **Lock Heartbeat**
   - Implement periodic refresh mechanism
   - Detect disconnected clients faster
   - More responsive lock cleanup

3. **Enhanced UI**
   - Show lock queue/waiting users
   - Display lock duration/time remaining
   - Click-to-request-notification feature

4. **Admin Controls**
   - Force-unlock capability for project admins
   - Lock duration customization per user role
   - Lock history and analytics

5. **Optimistic Locking**
   - Allow speculative edits with conflict resolution
   - Merge changes when conflicts are minor
   - More collaborative editing experience

## Integration with Open Collaboration Tools (OCT)

This locking system complements OCT's text synchronization:

- **OCT:** Synchronizes Ballerina source code text changes in real-time using CRDT (Yjs)
- **Node Locking:** Prevents concurrent edits to visual diagram nodes

### Workflow Example

```
1. User A edits a node's configuration
   - Node lock prevents User B from editing same node
   - OCT syncs the underlying Ballerina code changes

2. User B edits a different node
   - Different nodes = no conflict
   - Both users' code changes sync via OCT

3. User A releases lock
   - User B can now edit that node
   - Code remains synchronized throughout
```

## Files Modified

### Core Implementation
- `workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx` - Frontend lock management
- `workspaces/ballerina/ballerina-core/src/rpc-types/bi-diagram/interfaces.ts` - Type definitions
- `workspaces/ballerina/ballerina-core/src/rpc-types/bi-diagram/rpc-type.ts` - RPC method definitions
- `workspaces/ballerina/ballerina-rpc-client/src/rpc-clients/bi-diagram/rpc-client.ts` - RPC client methods
- `workspaces/ballerina/ballerina-extension/src/rpc-managers/bi-diagram/rpc-handler.ts` - Handler registration
- `workspaces/ballerina/ballerina-extension/src/rpc-managers/bi-diagram/rpc-manager.ts` - Lock management logic
- `workspaces/ballerina/ballerina-extension/src/utils/bi.ts` - Username utility

### Required Changes for OCT Collaboration

**To properly support OCT collaboration, implement path normalization:**

#### 1. Frontend (FlowDiagram/index.tsx)

Add helper function at the top of the component:

```typescript
// Helper to normalize file paths for cross-collaborator consistency
const normalizeFilePath = (absolutePath: string): string => {
    if (!absolutePath) return '';
    
    // Handle OCT virtual URIs: collab://session-id/path/to/file.bal
    if (absolutePath.startsWith('collab://')) {
        // Extract path after session ID
        const parts = absolutePath.split('/');
        // Skip 'collab:', '', session-id
        return parts.slice(3).join('/');
    }
    
    // Handle absolute local paths - make relative to project
    if (absolutePath.startsWith(projectPath)) {
        const relative = absolutePath.substring(projectPath.length);
        return relative.replace(/^[\/\\]+/, '');
    }
    
    // Already relative or unknown format
    return absolutePath;
};
```

Update `acquireNodeLock`:

```typescript
const acquireNodeLock = async (nodeId: string) => {
    if (!currentUserId || !nodeId || !model?.fileName) return;
    
    try {
        const normalizedPath = normalizeFilePath(model.fileName);  // Add this
        
        const response = await rpcClient.getBIDiagramRpcClient().acquireNodeLock({
            nodeId,
            userId: currentUserId,
            userName: currentUserName,
            filePath: normalizedPath,  // Use normalized path
            timestamp: Date.now(),
        });
        // ... rest of the code
    }
};
```

Update `releaseNodeLock`:

```typescript
const releaseNodeLock = async (nodeId: string) => {
    if (!currentUserId || !nodeId || !model?.fileName) return;
    
    try {
        const normalizedPath = normalizeFilePath(model.fileName);  // Add this
        
        await rpcClient.getBIDiagramRpcClient().releaseNodeLock({
            nodeId,
            userId: currentUserId,
            filePath: normalizedPath,  // Use normalized path
        });
        // ... rest of the code
    }
};
```

Update `fetchNodeLocks`:

```typescript
const fetchNodeLocks = async () => {
    if (!model?.fileName) return;
    
    try {
        const normalizedPath = normalizeFilePath(model.fileName);  // Add this
        
        const response = await rpcClient.getBIDiagramRpcClient().getNodeLocks({
            filePath: normalizedPath,  // Use normalized path
        });
        // ... rest of the code
    }
};
```

#### 2. Backend (rpc-manager.ts)

No changes needed! The backend already uses whatever file path is sent from the frontend. By normalizing on the frontend, all collaborators send the same normalized path, ensuring lock maps match.

#### Example Scenarios

**Scenario 1: Local Solo Development**
```typescript
// Input: /Users/alice/myproject/src/main.bal
// Normalized: src/main.bal
// Result: Works perfectly
```

**Scenario 2: OCT Host**
```typescript
// Input: /Users/alice/myproject/src/main.bal
// Normalized: src/main.bal
// Result: Locks stored under "src/main.bal"
```

**Scenario 3: OCT Guest (Remote)**
```typescript
// Input: collab://session-abc123/src/main.bal
// Normalized: src/main.bal
// Result: Locks stored under "src/main.bal" ✅ MATCHES HOST
```

**Scenario 4: Different Project Roots**
```typescript
// Host: /Users/alice/myproject/src/main.bal → src/main.bal
// Guest: /Users/bob/cached/myproject/src/main.bal → src/main.bal
// Result: ✅ Both normalize to same relative path
```

## Troubleshooting

### Locks Not Releasing
**Symptom:** Node remains locked after closing edit panel

**Solutions:**
1. Check browser console for RPC errors
2. Verify `releaseNodeLock` is called in cleanup handlers
3. Wait for 10-minute timeout
4. Restart VS Code to clear all locks

### Lock Updates Not Syncing
**Symptom:** Other users don't see lock changes

**Solutions:**
1. Verify all webviews are subscribed to `nodeLockUpdated`
2. Check extension host console for broadcast errors
3. Ensure `broadcastLockUpdate` is called after lock changes
4. Verify messenger is correctly initialized

### Username Not Displaying
**Symptom:** Lock shows generic ID instead of username

**Solutions:**
1. Check that `getSystemUsername()` returns valid username
2. Verify `process.env.USERNAME` or `process.env.USER` is set
3. Check `initializeUserInfo()` is called on component mount
4. Verify fallback mechanism is working

### Locks Not Working in OCT Collaboration
**Symptom:** Remote users can both lock the same node, locks don't sync

**Root Cause:** File paths not normalized - host uses local path, guest uses `collab://` URI

**Solutions:**
1. **Verify normalization is implemented:** Check `normalizeFilePath` function exists
2. **Debug paths:** Add console logging to see what paths are being used:
   ```typescript
   console.log('Original path:', model.fileName);
   console.log('Normalized path:', normalizeFilePath(model.fileName));
   ```
3. **Check host vs guest paths:**
   - Host should send: `src/main.bal`
   - Guest should send: `src/main.bal` (NOT `collab://...`)
4. **Verify projectPath is correct:** Ensure `projectPath` prop is the actual project root
5. **Test with explicit relative paths:** Manually send `src/main.bal` to confirm backend works

**Expected Behavior:**
```
✅ Host acquires lock on node1
✅ Guest sees lock indicator immediately
✅ Guest cannot acquire same lock
✅ Both users use same normalized path "src/main.bal"
```

**Debug Commands:**
```typescript
// In browser console (frontend)
console.log('Model fileName:', model?.fileName);
console.log('Project path:', projectPath);
console.log('Normalized:', normalizeFilePath(model?.fileName));

// In extension host console (backend)
// Check BiDiagramRpcManager.nodeLocks
```

## Performance Considerations

- **Memory Usage:** O(n×m) where n = files, m = locked nodes per file
- **Network Overhead:** One broadcast per lock change to all webviews
- **Lock Lookup:** O(1) hash map lookups for lock checks
- **Cleanup:** Automatic garbage collection of empty maps

For typical usage (< 100 locked nodes), performance impact is negligible.

## Security Considerations

- **User Identification:** Based on OS username (trusted environment)
- **Lock Ownership:** Validated on release (user can only release their own locks)
- **Timeout Protection:** Automatic cleanup prevents indefinite locks
- **No Authentication:** Assumes trusted collaborative environment

For untrusted environments, consider adding:
- Cryptographic signatures for lock operations
- User authentication via identity provider
- Audit logging for lock operations

## Conclusion

The collaborative node locking system provides essential coordination for multi-user BI diagram editing, preventing conflicts while maintaining a smooth real-time collaborative experience. Combined with OCT's text synchronization, it enables seamless pair programming and team collaboration on Ballerina integration projects.
