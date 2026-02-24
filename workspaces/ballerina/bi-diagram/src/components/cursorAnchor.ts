interface DiagramPoint {
    x: number;
    y: number;
}

function getModelNodeCenter(node: any): DiagramPoint | undefined {
    if (!node) {
        return undefined;
    }

    const nodeX = Number(node.getX?.());
    const nodeY = Number(node.getY?.());
    const nodeWidth = Number(node.getWidth?.() ?? node.width ?? 0);
    const nodeHeight = Number(node.getHeight?.() ?? node.height ?? 0);

    if (!Number.isFinite(nodeX) || !Number.isFinite(nodeY)) {
        return undefined;
    }

    return {
        x: nodeX + (Number.isFinite(nodeWidth) ? nodeWidth / 2 : 0),
        y: nodeY + (Number.isFinite(nodeHeight) ? nodeHeight / 2 : 0),
    };
}

export function getNodeCenter(engine: any, nodeId?: string): DiagramPoint | undefined {
    if (!engine || !nodeId) {
        return undefined;
    }

    const model = engine.getModel?.();
    if (!model) {
        return undefined;
    }

    const node = model.getNode?.(nodeId);
    if (!node) {
        return undefined;
    }

    return getModelNodeCenter(node);
}

export function getPreferredCursorAnchor(engine: any, nodeId?: string): DiagramPoint | undefined {
    const anchorNodeId = nodeId;
    if (!anchorNodeId) {
        return undefined;
    }

    return getNodeCenter(engine, anchorNodeId);
}
