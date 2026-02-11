export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

/**
 * Return true if point `p` lies inside rectangle `r` (inclusive bounds).
 * Behaviour preserved from the original inline implementation.
 */
export const pointInRect = (p: Point, r: Rect): boolean =>
    p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/**
 * Check if two line segments (p1-p2) and (p3-p4) intersect (proper intersection).
 * Uses the same orientation test as the original code and preserves the
 * exact boolean semantics ((o1*o2 < 0) && (o3*o4 < 0)).
 */
export const segIntersectsSeg = (
    p1: Point,
    p2: Point,
    p3: Point,
    p4: Point
): boolean => {
    const orient = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const o1 = orient(p1, p2, p3);
    const o2 = orient(p1, p2, p4);
    const o3 = orient(p3, p4, p1);
    const o4 = orient(p3, p4, p2);
    return (o1 * o2 < 0) && (o3 * o4 < 0);
};

/**
 * True if segment (a-b) intersects the axis-aligned rectangle `rect`.
 * Preserves original behaviour (returns true if either endpoint inside
 * rect, or segment intersects any rectangle edge).
 */
export const segmentIntersectsRect = (a: Point, b: Point, rect: Rect): boolean => {
    if (pointInRect(a, rect) || pointInRect(b, rect)) return true;
    const r1 = { x: rect.x, y: rect.y } as Point;
    const r2 = { x: rect.x + rect.w, y: rect.y } as Point;
    const r3 = { x: rect.x + rect.w, y: rect.y + rect.h } as Point;
    const r4 = { x: rect.x, y: rect.y + rect.h } as Point;
    if (segIntersectsSeg(a, b, r1, r2)) return true;
    if (segIntersectsSeg(a, b, r2, r3)) return true;
    if (segIntersectsSeg(a, b, r3, r4)) return true;
    if (segIntersectsSeg(a, b, r4, r1)) return true;
    return false;
};
