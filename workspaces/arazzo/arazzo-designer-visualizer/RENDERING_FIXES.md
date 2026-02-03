# React Flow Node Rendering & Edge Connection Fixes

## Issues Fixed

### 1. ✅ Node Type Registration Mismatch (Critical)

**Problem**: Custom nodes appeared as blank white squares because React Flow couldn't find the node components.

**Root Cause**: The `NodeFactoryVisitor.mapType()` method was returning lowercase keys that didn't match the `nodeTypes` registry:
- Returned: `'start'`, `'end'`, `'condition'`, `'retry'`, `'portal'`
- Expected: `'startNode'`, `'endNode'`, `'conditionNode'`, `'retryNode'`, `'portalNode'`

**Fix Applied**: Updated `mapType()` in [NodeFactoryVisitor.ts](c:/Users/Himeth%20Walgampaya/Important/vs_plugin_testing/official_wso2/vscode-extensions/workspaces/arazzo/arazzo-designer-visualizer/src/visitors/NodeFactoryVisitor.ts#L151-L158):
```typescript
private mapType(type: string): string {
    if (type === 'CONDITION') { return 'conditionNode'; }  // was 'condition'
    if (type === 'START') { return 'startNode'; }          // was 'start'
    if (type === 'END') { return 'endNode'; }              // was 'end'
    if (type === 'RETRY') { return 'retryNode'; }          // was 'retry'
    return 'stepNode';
}
```

Also fixed portal node type from `'portal'` to `'portalNode'` in two locations (lines 79 and 94).

---

### 2. ✅ StepNode Handle Type Mismatch

**Problem**: Edges couldn't connect to StepNode's top handle because it was marked as `source` instead of `target`.

**Root Cause**: The `h-top` handle was defined as `type="source"` but portal edges connect TO it (as target), causing connection failures.

**Fix Applied**: Changed h-top from source to target in [StepNodeWidget.tsx](c:/Users/Himeth%20Walgampaya/Important/vs_plugin_testing/official_wso2/vscode-extensions/workspaces/arazzo/arazzo-designer-visualizer/src/components/nodes/StepNode/StepNodeWidget.tsx#L36-L40):
```tsx
<NodeStyles.StyledHandle
    type="target"      // Changed from "source"
    position={Position.Top}
    id="h-top"
    isConnectable={isConnectable}
/>
```

---

### 3. ✅ StartNode Label Not Dynamic

**Problem**: StartNode always displayed "Start" regardless of data.label.

**Fix Applied**: Updated [StartNodeWidget.tsx](c:/Users/Himeth%20Walgampaya/Important/vs_plugin_testing/official_wso2/vscode-extensions/workspaces/arazzo/arazzo-designer-visualizer/src/components/nodes/StartNode/StartNodeWidget.tsx#L73):
```tsx
<StartNodeLabel>{data.label || 'Start'}</StartNodeLabel>
```

---

## Debug Enhancements Added

### Console Logging for Troubleshooting

Added debug logs to help diagnose issues during development:

1. **Node Types Registration** ([nodes/index.ts](c:/Users/Himeth%20Walgampaya/Important/vs_plugin_testing/official_wso2/vscode-extensions/workspaces/arazzo/arazzo-designer-visualizer/src/components/nodes/index.ts#L50)):
   ```typescript
   console.log('[nodeTypes] Registered node types:', Object.keys(nodeTypes));
   // Output: ['stepNode', 'startNode', 'endNode', 'conditionNode', 'retryNode', 'portalNode']
   ```

2. **Node Creation** ([NodeFactoryVisitor.ts](c:/Users/Himeth%20Walgampaya/Important/vs_plugin_testing/official_wso2/vscode-extensions/workspaces/arazzo/arazzo-designer-visualizer/src/visitors/NodeFactoryVisitor.ts#L28-L34)):
   ```typescript
   console.log(`[NodeFactory] Creating node:`, { 
       id: reactNode.id, 
       type: reactNode.type,        // e.g., 'startNode'
       internalType: node.type,     // e.g., 'START'
       label: reactNode.data.label,
       position: reactNode.position 
   });
   ```

3. **Edge Creation** ([NodeFactoryVisitor.ts](c:/Users/Himeth%20Walgampaya/Important/vs_plugin_testing/official_wso2/vscode-extensions/workspaces/arazzo/arazzo-designer-visualizer/src/visitors/NodeFactoryVisitor.ts#L154-L160)):
   ```typescript
   console.log(`[NodeFactory] Creating edge:`, {
       from: source.id,
       to: target.id,
       sourceHandle: edge.sourceHandle,  // e.g., 'h-right'
       targetHandle: edge.targetHandle,  // e.g., 'h-left'
       targetType: target.type
   });
   ```

---

## Handle Configuration Reference

### StepNode Handles
```tsx
<Handle type="target" position={Position.Left} id="h-left" />
<Handle type="target" position={Position.Top} id="h-top" />       // Target for portal connections
<Handle type="source" position={Position.Right} id="h-right" />
<Handle type="source" position={Position.Bottom} id="h-bottom" />
```

### StartNode Handles
```tsx
<Handle type="source" position={Position.Right} id="h-right" />
```

### EndNode Handles
```tsx
<Handle type="target" position={Position.Left} id="h-left" />
<Handle type="target" position={Position.Top} id="h-top" />
```

### ConditionNode Handles
```tsx
<Handle type="target" position={Position.Left} id="h-left" />
<Handle type="source" position={Position.Right} id="h-right" />
```

### RetryNode Handles
```tsx
<Handle type="target" position={Position.Left} id="h-left" />
<Handle type="target" position={Position.Top} id="h-top" />
```

### PortalNode Handles
```tsx
<Handle type="target" position={Position.Bottom} id="h-bottom" />
<Handle type="source" position={Position.Bottom} id="h-bottom-source" />
```

---

## Edge Connection Logic

### Normal Edges
```typescript
// Left-to-right flow: source's h-right → target's h-left
sourceHandle: 'h-right'
targetHandle: 'h-left'
```

### Failure Edges
```typescript
// Bottom flow to END/RETRY nodes: source's h-bottom → target's h-top
sourceHandle: 'h-bottom'
targetHandle: 'h-top'
```

### Portal Edges
```typescript
// Exit portal: source node → source portal
sourceHandle: 'h-right' or 'h-bottom'
targetHandle: 'h-bottom'

// Entry portal: target portal → target node
sourceHandle: 'h-bottom'
targetHandle: 'h-top'
```

---

## Testing Checklist

### Visual Verification
- [ ] **StartNode**: Circular, PRIMARY background, displays label
- [ ] **EndNode**: Circular, ERROR background with inner circle
- [ ] **ConditionNode**: Diamond shape with BranchIcon
- [ ] **RetryNode**: Circular, SECONDARY background with ↻ icon
- [ ] **StepNode**: Rectangle with label and description
- [ ] **PortalNode**: Pill-shaped with ➔ icon

### Edge Connections
- [ ] Normal flow edges (blue) connect left-to-right
- [ ] Failure edges (red) connect from bottom to top
- [ ] Portal edges (cyan) connect through portal nodes
- [ ] Condition nodes branch correctly
- [ ] All edges have arrow markers

### Console Output
Check browser console for:
```
[nodeTypes] Registered node types: (6) ['stepNode', 'startNode', ...]
[NodeFactory] Creating node: {id: 'start-node', type: 'startNode', ...}
[NodeFactory] Creating edge: {from: 'start-node', to: 'step-1', ...}
```

---

## Compilation Status

✅ **0 TypeScript Errors**

All changes compiled successfully with the watch task running.

---

## Summary of Changes

| File | Change | Lines |
|------|--------|-------|
| `NodeFactoryVisitor.ts` | Fixed mapType() to return camelCase keys | 151-158 |
| `NodeFactoryVisitor.ts` | Fixed portal type from 'portal' to 'portalNode' | 79, 94 |
| `NodeFactoryVisitor.ts` | Added node creation debug logging | 28-34 |
| `NodeFactoryVisitor.ts` | Added edge creation debug logging | 154-160 |
| `StepNodeWidget.tsx` | Changed h-top from source to target | 36-40 |
| `StartNodeWidget.tsx` | Made label dynamic using data.label | 73 |
| `nodes/index.ts` | Added nodeTypes registration debug log | 50 |

---

## Expected Behavior After Fixes

1. **Nodes render with full styling** - no more white squares
2. **All edges draw correctly** between nodes
3. **Portal navigation works** (clicking portal centers on paired portal)
4. **Console shows detailed debug info** for troubleshooting
5. **Handle connections are bidirectional** where needed (top handles)

The graph should now render correctly with proper node styling and complete edge connections!
