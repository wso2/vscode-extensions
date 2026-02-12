import type { Point as P } from './WaypointCreator';

export interface Point { x: number; y: number }
export interface EdgeLike {
    id: string;
    source?: string;
    target?: string;
    sourceX?: number;
    sourceY?: number;
    targetX?: number;
    targetY?: number;
    sourceHandle?: string;
    targetHandle?: string;
    data?: { waypoints?: Point[] };
    style?: any;
}

export const BRIDGE_RADIUS = 6;
export const DEFAULT_EPS = 0.5;

/**
 * Reconstruct the points for an edge from either explicit coordinates (sourceX/targetX)
 * or from node positions (nodeById map). Preserves the original behaviour used by
 * `PlannedPathEdge`.
 */
export function getPointsForEdge(e: EdgeLike, nodeById: Map<string, any>): Point[] {
    const wps = Array.isArray(e.data?.waypoints) ? e.data!.waypoints! : [];

    const computeEndpointFromNode = (node: any, handleId?: string) => {
        const xLeft = node.position?.x ?? 0;
        const yTop = node.position?.y ?? 0;
        const w = (node.style && node.style.width) || node.width || 0;
        const h = (node.style && node.style.height) || node.height || 0;
        const xRight = xLeft + w;
        const yBottom = yTop + h;
        switch (handleId) {
            case 'h-bottom': return { x: (xLeft + xRight) / 2, y: yBottom };
            case 'h-top': return { x: (xLeft + xRight) / 2, y: yTop };
            case 'h-left': return { x: xLeft, y: (yTop + yBottom) / 2 };
            case 'h-right-source':
            case 'h-right-target': return { x: xRight, y: (yTop + yBottom) / 2 };
            default: return { x: (xLeft + xRight) / 2, y: (yTop + yBottom) / 2 };
        }
    };

    const src = (typeof e.sourceX === 'number' && typeof e.sourceY === 'number')
        ? { x: e.sourceX, y: e.sourceY }
        : (e.source && nodeById.get(e.source) ? computeEndpointFromNode(nodeById.get(e.source), e.sourceHandle) : { x: 0, y: 0 });

    const tgt = (typeof e.targetX === 'number' && typeof e.targetY === 'number')
        ? { x: e.targetX, y: e.targetY }
        : (e.target && nodeById.get(e.target) ? computeEndpointFromNode(nodeById.get(e.target), e.targetHandle) : { x: 0, y: 0 });

    return [src, ...wps, tgt];
}

/**
 * Return the orthogonal intersection point between a vertical segment (x, y1..y2)
 * and a horizontal segment (x1..x2, y). Returns null when they don't intersect.
 * Behaviour mirrors the inline helper used previously (with an EPS tolerance).
 */
export function getOrthogonalIntersectionFromCoords(
    vX: number,
    vY1: number,
    vY2: number,
    hX1: number,
    hX2: number,
    hY: number,
    eps = DEFAULT_EPS
): Point | null {
    const minHX = Math.min(hX1, hX2) - eps;
    const maxHX = Math.max(hX1, hX2) + eps;
    const minVY = Math.min(vY1, vY2) - eps;
    const maxVY = Math.max(vY1, vY2) + eps;
    if (vX >= minHX && vX <= maxHX && hY >= minVY && hY <= maxVY) {
        return { x: vX, y: hY };
    }
    return null;
}

type Orientation = 'vertical' | 'horizontal' | 'none';

export interface DetectedIntersection {
    point: Point;
    orientation: Orientation; // orientation of the CURRENT segment (vertical/horizontal)
}

/**
 * Detect orthogonal (90°) intersections between a given segment (from->to)
 * and all segments in `otherEdges`. Returns a de-duplicated, filtered and
 * sorted list of intersection points suitable for bridge emission.
 *
 * - Preserves the exact filtering used previously: intersections closer than
 *   `bridgeRadius + 0.5` to either segment endpoint are removed.
 * - Rounds coordinates to 0.1 for deduplication parity with prior code.
 */
export function detectBridgesForSegment(
    from: Point,
    to: Point,
    otherEdges: EdgeLike[],
    nodeById: Map<string, any>,
    bridgeRadius = BRIDGE_RADIUS,
    eps = DEFAULT_EPS
): DetectedIntersection[] {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const isVertical = Math.abs(dx) <= eps && Math.abs(dy) > eps;
    const isHorizontal = Math.abs(dy) <= eps && Math.abs(dx) > eps;
    
    // Only horizontal segments get bridges; vertical segments pass through
    if (!isHorizontal) return [];

    const hits: number[] = [];

    // Current segment is horizontal; detect vertical segments in other edges
    for (const oe of otherEdges) {
        const pts = getPointsForEdge(oe, nodeById);
        for (let j = 1; j < pts.length; j++) {
            const a = pts[j - 1];
            const b = pts[j];
            // Check if other segment is vertical
            if (Math.abs(a.x - b.x) <= eps) {
                // other segment is vertical: check intersection
                const minAX = Math.min(from.x, to.x) - eps;
                const maxAX = Math.max(from.x, to.x) + eps;
                const minVY = Math.min(a.y, b.y) - eps;
                const maxVY = Math.max(a.y, b.y) + eps;
                if (a.x >= minAX && a.x <= maxAX && from.y >= minVY && from.y <= maxVY) {
                    hits.push(a.x);
                }
            }
        }
    }

    if (hits.length === 0) return [];

    const minCoord = Math.min(from.x, to.x) + bridgeRadius + 0.5;
    const maxCoord = Math.max(from.x, to.x) - bridgeRadius - 0.5;

    const uniq = Array.from(new Set(hits.map(h => Math.round(h * 10) / 10)))
        .map(v => v)
        .filter(v => v >= minCoord && v <= maxCoord);

    if (uniq.length === 0) return [];

    const dir = to.x > from.x ? 1 : -1;

    uniq.sort((a, b) => (dir === 1 ? a - b : b - a));

    return uniq.map(v => ({
        point: { x: v, y: from.y },
        orientation: 'horizontal'
    }));
}

/**
 * Build the SVG path fragment for a straight orthogonal segment (from->to)
 * inserting semicircular bridge arcs for every intersection provided.
 *
 * This keeps rendering behaviour identical to the previous inline code.
 */
export function buildSegmentPathWithBridges(
    from: Point,
    to: Point,
    intersections: DetectedIntersection[],
    bridgeRadius = BRIDGE_RADIUS
): string {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const isHorizontal = Math.abs(dy) <= DEFAULT_EPS && Math.abs(dx) > DEFAULT_EPS;
    
    // Only horizontal segments get bridges (vertical segments return normal line)
    if (!isHorizontal || intersections.length === 0) return ` L ${to.x} ${to.y}`;

    const dir = to.x > from.x ? 1 : -1;
    let out = '';
    for (const it of intersections) {
        const interX = it.point.x;
        const beforeX = interX - dir * bridgeRadius;
        const afterX = interX + dir * bridgeRadius;
        out += ` L ${beforeX} ${from.y}`;
        out += ` A ${bridgeRadius} ${bridgeRadius} 0 0 1 ${afterX} ${from.y}`;
    }

    out += ` L ${to.x} ${to.y}`;
    return out;
}
