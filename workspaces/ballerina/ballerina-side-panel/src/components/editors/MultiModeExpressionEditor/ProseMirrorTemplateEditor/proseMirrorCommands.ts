/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands";
import { wrapInList, liftListItem } from "prosemirror-schema-list";
import { schema } from "prosemirror-schema-basic";
import { MarkType, NodeType } from "prosemirror-model";

export type Command = (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => boolean;

export const toggleBold: Command = toggleMark(schema.marks.strong);

export const toggleItalic: Command = toggleMark(schema.marks.em);

export const toggleCode: Command = toggleMark(schema.marks.code);

export const toggleLink: Command = (state, dispatch, view) => {
    const linkMark = schema.marks.link;
    const { from, to } = state.selection;

    // Check if link mark is active
    if (isMarkActive(state, linkMark)) {
        // Remove link by toggling it off
        return toggleMark(linkMark)(state, dispatch, view);
    }

    // Add link with placeholder URL
    if (dispatch) {
        const href = "url";
        const mark = linkMark.create({ href });
        dispatch(state.tr.addStoredMark(mark));
    }
    return true;
};

export const setHeading = (level: number): Command => {
    return setBlockType(schema.nodes.heading, { level });
};

export const setParagraph: Command = setBlockType(schema.nodes.paragraph);

export const toggleBlockquote: Command = (state, dispatch, view) => {
    const { $from } = state.selection;

    // Check if we're already in a blockquote
    for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node.type === schema.nodes.blockquote) {
            // Lift out of blockquote - use wrapIn to toggle
            return wrapIn(schema.nodes.blockquote)(state, dispatch, view);
        }
    }

    // Wrap in blockquote
    return wrapIn(schema.nodes.blockquote)(state, dispatch, view);
};

export const toggleBulletList: Command = (state, dispatch, view) => {
    const { $from } = state.selection;

    // Check if we're already in a bullet list
    for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node.type === schema.nodes.bullet_list) {
            // Lift out of list
            return liftListItem(schema.nodes.list_item)(state, dispatch, view);
        }
    }

    // Wrap in bullet list
    return wrapInList(schema.nodes.bullet_list)(state, dispatch, view);
};

export const toggleOrderedList: Command = (state, dispatch, view) => {
    const { $from } = state.selection;

    // Check if we're already in an ordered list
    for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node.type === schema.nodes.ordered_list) {
            // Lift out of list
            return liftListItem(schema.nodes.list_item)(state, dispatch, view);
        }
    }

    // Wrap in ordered list
    return wrapInList(schema.nodes.ordered_list)(state, dispatch, view);
};

export const isMarkActive = (state: EditorState, type: MarkType): boolean => {
    const { from, to, $from, empty } = state.selection;

    if (empty) {
        return !!type.isInSet(state.storedMarks || $from.marks());
    }

    return state.doc.rangeHasMark(from, to, type);
};

export const isNodeActive = (state: EditorState, type: NodeType, attrs?: Record<string, any>): boolean => {
    const { $from, to } = state.selection;

    for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node.type === type) {
            if (!attrs) return true;
            return Object.keys(attrs).every(key => node.attrs[key] === attrs[key]);
        }
    }

    return false;
};
