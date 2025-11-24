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
import { toggleMark, setBlockType, wrapIn, lift } from "prosemirror-commands";
import { wrapInList, liftListItem } from "prosemirror-schema-list";
import { MarkType, NodeType } from "prosemirror-model";

export type Command = (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => boolean;

export const toggleBold: Command = (state, dispatch, view) => {
    return toggleMark(state.schema.marks.strong)(state, dispatch, view);
};

export const toggleItalic: Command = (state, dispatch, view) => {
    return toggleMark(state.schema.marks.em)(state, dispatch, view);
};

export const toggleCode: Command = (state, dispatch, view) => {
    return toggleMark(state.schema.marks.code)(state, dispatch, view);
};

export const toggleLink: Command = (state, dispatch) => {
    const linkMarkType = state.schema.marks.link;
    const { from, to } = state.selection;

    if (from === to) return false;

    if (state.doc.rangeHasMark(from, to, linkMarkType)) {
        if (dispatch) {
            dispatch((state.tr as any).removeMark(from, to, linkMarkType));
        }
        return true;
    }

    if (dispatch) {
        const href = "url";
        const mark = linkMarkType.create({ href });
        dispatch((state.tr as any).addMark(from, to, mark));
    }
    return true;
};

export const toggleHeading = (level: number): Command => {
    return (state, dispatch, view) => {
        const { schema } = state;
        const isActive = isNodeActive(state, schema.nodes.heading, { level });

        if (isActive) {
            return setBlockType(schema.nodes.paragraph)(state, dispatch, view);
        }
        return setBlockType(schema.nodes.heading, { level })(state, dispatch, view);
    };
};

export const setParagraph: Command = (state, dispatch, view) => {
    return setBlockType(state.schema.nodes.paragraph)(state, dispatch, view);
};

export const toggleBlockquote: Command = (state, dispatch, view) => {
    const blockquote = state.schema.nodes.blockquote;
    if (isNodeActive(state, blockquote)) {
        return lift(state, dispatch);
    }
    return wrapIn(blockquote)(state, dispatch, view);
};

export const toggleBulletList: Command = (state, dispatch, view) => {
    const bulletList = state.schema.nodes.bullet_list;
    const listItem = state.schema.nodes.list_item;

    if (isListActive(state, bulletList)) {
        return liftListItem(listItem)(state, dispatch, view);
    }
    return wrapInList(bulletList)(state, dispatch, view);
};

export const toggleOrderedList: Command = (state, dispatch, view) => {
    const orderedList = state.schema.nodes.ordered_list;
    const listItem = state.schema.nodes.list_item;

    if (isListActive(state, orderedList)) {
        return liftListItem(listItem)(state, dispatch, view);
    }
    return wrapInList(orderedList)(state, dispatch, view);
};

export const isMarkActive = (state: EditorState, type: MarkType): boolean => {
    const { from, to, $from, empty } = state.selection;
    if (empty) {
        return !!type.isInSet(state.storedMarks || $from.marks());
    }
    return state.doc.rangeHasMark(from, to, type);
};

export const isNodeActive = (state: EditorState, type: NodeType, attrs?: Record<string, any>): boolean => {
    const { $from } = state.selection;
    for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node.type === type) {
            if (!attrs) return true;
            return Object.keys(attrs).every(key => node.attrs[key] === attrs[key]);
        }
    }
    return false;
};

export const isListActive = (state: EditorState, listType: NodeType): boolean => {
    const { $from } = state.selection;
    for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node.type.name === 'list_item') {
            if (d > 0) {
                const parent = $from.node(d - 1);
                if (parent.type === listType) {
                    return true;
                }
            }
        }
    }
    return false;
};
