# Collaboration Node Deletion Bugs

## Overview

Two bugs exist in the collaboration node-deletion path of the Ballerina BI diagram extension. Both affect multi-user sessions where one participant deletes a flow node.

---

## Bug 1: Node Not Deleted After Refresh (Rare Race Condition)

### Symptom

Occasionally, when a collaborator deletes a node, the flow diagram refreshes (spinner shows, model is fetched) but the deleted node remains visible on both the host's and collaborator's diagrams.

### Root Cause

`handleOnDeleteNode` ([FlowDiagram/index.tsx:2497](../workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx)) triggers `getFlowModel` **multiple times concurrently without cancellation**. An earlier response (containing the still-live node) can resolve after a later correct response, overwriting the good model state.

**Sources of concurrent `getFlowModel` calls on a single node deletion:**

1. `handleOnDeleteNode` calls `updateArtifactLocation(deleteNodeResponse)` (line 2508).  
   `updateArtifactLocation` (line 1981) falls through to `closeSidePanelAndFetchUpdatedFlowModel()` (line 2014) when no `isCreating*` flag is set — which is always the case for plain node deletion. This does not itself fetch the model, but it does run `resetNodeSelectionStates`.

2. `handleOnDeleteNode` **also** explicitly calls `closeSidePanelAndFetchUpdatedFlowModel()` again (line 2511) — a redundant second call.

3. `handleOnDeleteNode` calls `debouncedGetFlowModel()` (line 2513) — the intended explicit refresh.

4. On the **peer's machine**, the OCT file watcher fires → `updateView(false)` → `notifyCurrentWebview()` → `onProjectContentUpdated` → `debouncedGetFlowModel()` — a second concurrent refresh triggered by the synced file change.

5. The `onProjectContentUpdated` subscription (line 291–294) has **no dependency array**, so it re-registers a new listener on every render. Multiple accumulated listeners amplify the concurrent calls.

Since `getFlowModel` uses nested `.then()` chains with no AbortController or generation counter, an earlier in-flight promise can call `setModel(staleModel)` after a later correct one already applied the post-deletion state.

### Proposed Fix

**File:** [workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx](../workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx)

#### 1. Remove redundant `closeSidePanelAndFetchUpdatedFlowModel()` call from `handleOnDeleteNode`

Since `updateArtifactLocation` already calls it for the deletion path, the explicit second call at line 2511 is redundant.

```tsx
// handleOnDeleteNode — after the fix:
const handleOnDeleteNode = async (node: FlowNode) => {
    setShowProgressIndicator(true);
    const deleteNodeResponse = await rpcClient.getBIDiagramRpcClient().deleteFlowNode({
        filePath: model.fileName,
        flowNode: node,
    });
    if (deleteNodeResponse.artifacts.length === 0) {
        console.error(">>> Error updating source code", deleteNodeResponse);
    }
    await updateArtifactLocation(deleteNodeResponse); // handles closeSidePanel internally
    selectedNodeRef.current = undefined;
    // Removed: await closeSidePanelAndFetchUpdatedFlowModel();
    setShowProgressIndicator(false);
    debouncedGetFlowModel();
};
```

#### 2. Add a generation counter to `getFlowModel`

Ensures stale in-flight responses are silently discarded:

```tsx
const flowModelRequestGenRef = useRef(0);

const getFlowModel = () => {
    const gen = ++flowModelRequestGenRef.current;
    setShowProgressIndicator(true);
    onUpdate();
    // ... existing breakpoint fetch ...
    rpcClient.getBIDiagramRpcClient().getFlowModel({}).then((model) => {
        if (gen !== flowModelRequestGenRef.current) return; // discard stale response
        // ... existing setModel logic ...
    });
};
```

#### 3. Fix the `onProjectContentUpdated` subscription

Add cleanup and proper dependencies to prevent listener accumulation across renders:

```tsx
useEffect(() => {
    const unsubscribe = rpcClient.onProjectContentUpdated(() => {
        debouncedGetFlowModel();
    });
    return () => unsubscribe?.();
}, [rpcClient, debouncedGetFlowModel]);
```

---

## Bug 2: Remote Cursor Sync Stops After Any Node Deletion (100% Reproducible)

### Symptom

Whenever a node is deleted by any collaborator, the remote cursor syncing functionality stops working. Peer cursors disappear from the diagram and do not recover until a user moves their mouse.

### Root Cause

Two compounding mechanisms cause this, depending on which diagram type is being viewed:

#### Mechanism A — All diagram types: heartbeat gap after `sendPresenceUpdate` recreation

After deletion, the lock is released via `releaseNodeLock`. This causes `nodeLocks` state to update, which cascades:

- `sendPresenceUpdate` `useCallback` is recreated (dependency: `nodeLocks`, line 1448)
- `updateCursorPosition` `useMemo` (throttle wrapper) is recreated (dependency: `sendPresenceUpdate`, line 1451)
- The old throttle's `cancel()` is called via the cleanup `useEffect` (line 1459), discarding any pending mouse-movement cursor updates
- The heartbeat `useEffect` (line 1464) tears down the old interval and starts a new one

The new heartbeat's **first tick fires after `CURSOR_HEARTBEAT_INTERVAL_MS` (3 seconds)**. During those 3 seconds, cursor updates only happen if the user moves their mouse. After dismissing a delete context menu, the mouse is typically stationary — so the peer sees no cursor update for up to 3 seconds, making cursor sync appear broken.

#### Mechanism B — Resources specifically: full `BIFlowDiagram` remount via key change

For HTTP resource diagrams, `findViewByArtifact` ([state-machine-utils.ts:354–362](../workspaces/ballerina/ballerina-extension/src/utils/state-machine-utils.ts)) uses `dir.id` as the `identifier` for `DIRECTORY_MAP.RESOURCE`. This `id` is position-sensitive (derived from the resource's line range). When a node is deleted within the resource body, the resource's `endLine` shifts, changing `dir.id`.

**The full cascade on the peer's machine:**

1. Node deletion → OCT syncs file → `watcher.onDidChange` fires on peer
2. 150ms + 250ms LS settle windows → `updateView(false)` called (`isBatchInProgress = false` on peer)
3. `VIEW_UPDATE` sent to state machine → transitions to `webViewLoaded` → invokes `showView` service
4. `showView` calls `getView()` → `getViewByArtifacts()` → `findViewByArtifact()` → finds resource with new `dir.id` (updated endLine)
5. State machine resolves with updated `identifier` (new position-based `dir.id`)
6. `notifyCurrentWebview()` has a 50ms debounce, allowing `showView` to often complete first
7. `MainPanel.fetchContext()` runs → `getVisualizerLocation()` returns new `identifier`
8. `<DiagramWrapper key={value?.identifier}>` — key changed → **React UNMOUNTS old `DiagramWrapper`, mounts new one**
9. `BIFlowDiagram` unmounts → OCT listeners disposed → all state reset:
   - `isCollaborationActive = false` (initial state, line 168)
   - `lastBroadcastCursorRef.current = undefined` (ref reset on unmount, line 204)
10. After remount, `checkCollaboration()` is called immediately (line 410, async ~50–200ms RPC)
11. `isCollaborationActive` becomes `true` → heartbeat `useEffect` starts
12. Heartbeat first tick: `lastBroadcastCursorRef.current` is `undefined` → `if (!lastCursor) return` → **no cursor broadcast**
13. Cursor sync is dead until user moves mouse

### Proposed Fix

**Files:**
- [workspaces/ballerina/ballerina-extension/src/utils/state-machine-utils.ts](../workspaces/ballerina/ballerina-extension/src/utils/state-machine-utils.ts)
- [workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx](../workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx)

#### Fix 2a — Stabilize resource identifier (eliminates Mechanism B)

In `findViewByArtifact` (state-machine-utils.ts:354–362), change the resource `identifier` from position-based `dir.id` to name-based `dir.name`:

```ts
// Before:
case DIRECTORY_MAP.RESOURCE:
    return {
        location: {
            view: MACHINE_VIEW.BIDiagram,
            documentUri: currentDocumentUri,
            position: dir.position,
            identifier: dir.id,        // position-sensitive — changes on deletion
            artifactType: DIRECTORY_MAP.RESOURCE,
        }
    };

// After:
case DIRECTORY_MAP.RESOURCE:
    return {
        location: {
            view: MACHINE_VIEW.BIDiagram,
            documentUri: currentDocumentUri,
            position: dir.position,
            identifier: dir.name,      // stable — does not change when body nodes shift
            artifactType: DIRECTORY_MAP.RESOURCE,
        }
    };
```

`dir.name` for a resource (e.g. `"GET /path"`) is stable across internal node deletions because deleting a node within the resource body does not rename the resource. This prevents the `DiagramWrapper` key from changing and eliminates the full unmount/remount cycle.

> **Note**: Confirm that `dir.name` is unique enough across resources within the same service. If multiple resources can share the same name, use a composite key such as `dir.parentName + ":" + dir.name`.

#### Fix 2b — Immediate cursor broadcast on collaboration activation (fixes Mechanism A + B)

**Restore last cursor across remounts** using `sessionStorage` so the heartbeat has something to send immediately after a remount:

```tsx
// On component mount — restore last cursor position from sessionStorage
useEffect(() => {
    try {
        const saved = sessionStorage.getItem('bi_last_cursor');
        if (saved) {
            lastBroadcastCursorRef.current = JSON.parse(saved);
        }
    } catch {}
}, []);
```

**Persist last cursor** in `sendPresenceUpdate`, right after setting `lastBroadcastCursorRef.current`:

```tsx
lastBroadcastCursorRef.current = { x: broadcastX, y: broadcastY, nodeId: broadcastNodeId };
try {
    sessionStorage.setItem('bi_last_cursor', JSON.stringify(lastBroadcastCursorRef.current));
} catch {}
```

**Fire heartbeat immediately** when collaboration becomes active, not just after the first 3-second interval:

```tsx
// Replace the heartbeat useEffect (lines 1464–1481):
useEffect(() => {
    if (!isCollaborationActive) {
        return;
    }

    const fireCursorUpdate = () => {
        const lastCursor = lastBroadcastCursorRef.current;
        if (!lastCursor) return;
        sendPresenceUpdate(lastCursor.x, lastCursor.y, lastCursor.nodeId);
    };

    fireCursorUpdate(); // Immediate fire — skips the 3-second wait on activation/reactivation

    const heartbeatInterval = setInterval(fireCursorUpdate, CURSOR_HEARTBEAT_INTERVAL_MS);

    return () => {
        clearInterval(heartbeatInterval);
    };
}, [isCollaborationActive, sendPresenceUpdate]);
```

With these two changes together:
- After `sendPresenceUpdate` is recreated (Mechanism A), the new heartbeat fires immediately rather than waiting 3 seconds, eliminating the cursor gap
- After a full remount (Mechanism B), `lastBroadcastCursorRef` is restored from `sessionStorage`, and the heartbeat fires immediately when `isCollaborationActive` becomes `true`, recovering cursor sync without requiring mouse movement

---

## Critical Files Reference

| File | Relevant Lines | Purpose |
|------|---------------|---------|
| [FlowDiagram/index.tsx](../workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx) | 2497–2514 | `handleOnDeleteNode` — duplicate `closeSidePanelAndFetchUpdatedFlowModel` calls |
| [FlowDiagram/index.tsx](../workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx) | 1981–2015 | `updateArtifactLocation` — fallthrough to `closeSidePanelAndFetchUpdatedFlowModel` |
| [FlowDiagram/index.tsx](../workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx) | 875–950 | `getFlowModel` — add generation counter here |
| [FlowDiagram/index.tsx](../workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx) | 291–294 | `onProjectContentUpdated` subscription — add cleanup + deps |
| [FlowDiagram/index.tsx](../workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx) | 1464–1481 | Heartbeat `useEffect` — add immediate fire on activation |
| [FlowDiagram/index.tsx](../workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx) | 1373–1449 | `sendPresenceUpdate` — add `sessionStorage` persist |
| [state-machine-utils.ts](../workspaces/ballerina/ballerina-extension/src/utils/state-machine-utils.ts) | 354–362 | `findViewByArtifact` resource case — `dir.id` → `dir.name` |
| [MainPanel.tsx](../workspaces/ballerina/ballerina-visualizer/src/MainPanel.tsx) | 364–373 | `DiagramWrapper key={value?.identifier}` — stabilized by the identifier fix |
| [extension.ts](../workspaces/ballerina/ballerina-extension/src/extension.ts) | 207–303 | OCT file watcher — triggers `updateView(false)` on remote changes |

---

## Verification Steps

### Bug 1 (race condition)

1. Start a collaboration session between host and collaborator.
2. Collaborator deletes a node. Verify it disappears on both sides.
3. Repeat 20+ times on nodes of varying sizes (single-line and multi-line nodes).
4. Check browser console — `getFlowModel` log entries should show at most one concurrent in-flight call per side.

### Bug 2 (cursor sync)

1. Start a collaboration session. Verify both cursors are visible and tracking.
2. Collaborator right-clicks a node and selects Delete. Keep the mouse stationary after clicking.
3. Within 1 second of deletion, verify the deleting user's cursor is still visible to the host.
4. Verify the host's cursor is still visible to the collaborator.
5. Wait 5 seconds without moving the mouse — neither cursor should disappear.
6. Repeat on an HTTP resource diagram (e.g., `POST /orders`) — cursor sync must survive the deletion in this case too.
