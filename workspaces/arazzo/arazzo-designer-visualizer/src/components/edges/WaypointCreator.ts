import * as C from '../../constants/nodeConstants';

export interface Point { x: number; y: number }

interface Rect { x: number; y: number; w: number; h: number }
type lineType = 'skip';

/**
 * WaypointCreator (Right-first routing)
 *
 * Routing sequence (always route to the right of the blocking rect):
 * 1) from source: go down a bit
 * 2) move right ~1.5 * block.w (column)
 * 3) move down to a bit above target.y
 * 4) move left to be right above the target x
 * 5) finally connect to target
 *
 * This produces an ordered list of waypoints that, when drawn as straight
 * segments, routes the edge around the blocking rectangle on the right.
 */
export default function WaypointCreator(source: Point, target: Point, block: Rect, lineType: lineType): Point[] {
    switch (lineType) {
        case 'skip':
            // Column: move right by approximately 1.5 * block.w from block.x
            const columnX = block.x + block.w * C.WAYPOINT_SKIP_HORIZONTAL_OFFSET_MULTIPLIER;

            // 1) from source go down a bit
            const wp1: Point = { x: source.x, y: source.y + C.WAYPOINT_SKIP_VERTICAL_OFFSET };

            // 2) move right to the column while keeping same Y as wp1
            const wp2: Point = { x: columnX, y: wp1.y };

            // 3) move down to just above target.y
            const wp3: Point = { x: columnX, y: target.y - C.WAYPOINT_SKIP_VERTICAL_OFFSET };

            // 4) move left to be right above the target X
            const wp4: Point = { x: target.x, y: wp3.y };

            // Return waypoints in order (react-flow will draw lines between these and then to target)
            return [wp1, wp2, wp3, wp4];
        default:
            return [];
    }
}
