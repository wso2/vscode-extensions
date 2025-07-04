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
import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	DiagramModel,
    DiagramModelGenerics
} from "@projectstorm/react-diagrams";

import { DataMapperNodeModel } from '../Diagram/Node/commons/DataMapperNode';
import { getArrayFilterNodeHeight, getIONodeHeight, hasSameFilters, isSameView } from '../Diagram/utils/diagram-utils';
import { OverlayLayerModel } from '../Diagram/OverlayLayer/OverlayLayerModel';
import { ErrorNodeKind } from '../DataMapper/Error/DataMapperError';
import { useDMCollapsedFieldsStore, useDMSearchStore } from '../../store/store';
import { ArrayFilterNode, ArrayOutputNode, InputNode, ObjectOutputNode, SubMappingNode, UnionOutputNode } from '../Diagram/Node';
import { GAP_BETWEEN_FILTER_NODE_AND_INPUT_NODE, GAP_BETWEEN_INPUT_NODES, IO_NODE_DEFAULT_WIDTH, OFFSETS, VISUALIZER_PADDING } from '../Diagram/utils/constants';
import { LinkConnectorNode } from '../Diagram/Node/LinkConnector';
import { InputDataImportNodeModel, OutputDataImportNodeModel } from '../Diagram/Node/DataImport/DataImportNode';
import { ArrayFnConnectorNode } from '../Diagram/Node/ArrayFnConnector';
import { FocusedInputNode } from '../Diagram/Node/FocusedInput';
import { PrimitiveOutputNode } from '../Diagram/Node/PrimitiveOutput';
import { isInputNode, isOutputNode } from '../Diagram/Actions/utils'
import { useShallow } from 'zustand/react/shallow';

export const useRepositionedNodes = (
    nodes: DataMapperNodeModel[],
    zoomLevel: number,
    diagramModel: DiagramModel,
    filtersCollapsedChanged: boolean
) => {
    const nodesClone = [...nodes];
    const prevNodes = diagramModel.getNodes() as DataMapperNodeModel[];
    const filtersUnchanged = hasSameFilters(nodesClone, prevNodes) && !filtersCollapsedChanged;

    let prevBottomY = 0;

    nodesClone.forEach(node => {
        const exisitingNode = prevNodes.find(prevNode => prevNode.id === node.id);
        const sameView = isSameView(node, exisitingNode);

        if (node instanceof ObjectOutputNode
            || node instanceof ArrayOutputNode
            || node instanceof UnionOutputNode
            || node instanceof PrimitiveOutputNode
            || node instanceof OutputDataImportNodeModel
        ) {
            const x = (window.innerWidth - VISUALIZER_PADDING) * (100 / zoomLevel) - IO_NODE_DEFAULT_WIDTH;
            const y = exisitingNode && sameView && exisitingNode.getY() !== 0 ? exisitingNode.getY() : 0;
            node.setPosition(x, y);
        }
        if (node instanceof InputNode
            || node instanceof InputDataImportNodeModel
            || node instanceof SubMappingNode
            || node instanceof ArrayFilterNode
        ) {
            const x = OFFSETS.SOURCE_NODE.X;
            const computedY = prevBottomY + (prevBottomY ? GAP_BETWEEN_INPUT_NODES : 0);
            const hasArrayFilterNode = nodesClone.some(node => node instanceof ArrayFilterNode);
            const utilizeExistingY = exisitingNode && sameView
                && (!hasArrayFilterNode || filtersUnchanged)
                && exisitingNode.getY() !== 0
                && !(node instanceof SubMappingNode);
            let y = utilizeExistingY ? exisitingNode.getY() : computedY;
            node.setPosition(x, y);
            if (node instanceof InputNode) {
                const nodeHeight = getIONodeHeight(node.numberOfFields);
                prevBottomY = computedY + nodeHeight;
            } else if (node instanceof ArrayFilterNode) {
                const nodeHeight = getArrayFilterNodeHeight(node);
                prevBottomY = computedY + (nodeHeight * (100/zoomLevel)) + GAP_BETWEEN_FILTER_NODE_AND_INPUT_NODE;
            }
        }
        if (node instanceof FocusedInputNode) {
            const x = OFFSETS.SOURCE_NODE.X;
            const computedY = prevBottomY + (prevBottomY ? GAP_BETWEEN_INPUT_NODES : 0);
            let y = exisitingNode && sameView && filtersUnchanged && exisitingNode.getY() !== 0 ? exisitingNode.getY() : computedY;

            node.setPosition(x, y);
            const nodeHeight = getIONodeHeight(node.numberOfFields);
            prevBottomY = computedY + nodeHeight;
        }
    });

    return nodesClone;
}

export const useDiagramModel = (
    nodes: DataMapperNodeModel[],
    diagramModel: DiagramModel,
    onError:(kind: ErrorNodeKind) => void,
    zoomLevel: number,
    screenWidth: number
): {
    updatedModel: DiagramModel<DiagramModelGenerics>;
    isFetching: boolean;
    isError: boolean;
    refetch: any;
} => {
    const offSetX = diagramModel.getOffsetX();
    const offSetY = diagramModel.getOffsetY();
    const noOfNodes = nodes.length;
    const context = nodes.find(node => node.context)?.context;
    const { focusedST, views } = context ?? {};
	const focusedSrc = focusedST ? focusedST.getText() : undefined;
    const lastView = views ? views[views.length - 1] : undefined;

    const {collapsedObjectFields, expandedArrayFields} = useDMCollapsedFieldsStore(
            useShallow(state => ({
            collapsedObjectFields: state.collapsedObjectFields,
            expandedArrayFields: state.expandedArrayFields
        }))
    ); // Subscribe to collapsedFields

    const { inputSearch, outputSearch } = useDMSearchStore();
    const prevScreenWidth = useRef(screenWidth);

    const genModel = async () => {
        if (prevScreenWidth.current !== screenWidth && diagramModel.getNodes().length > 0) {
            const diagModelNodes = diagramModel.getNodes() as DataMapperNodeModel[];
            diagModelNodes.forEach(diagModelNode => {
                const repositionedNode = nodes.find(newNode => newNode.id === diagModelNode.id);
                if (repositionedNode) {
                    diagModelNode.setPosition(repositionedNode.getX(), repositionedNode.getY());
                }
            });
            diagramModel.setZoomLevel(zoomLevel);
            diagramModel.setOffset(offSetX, offSetY);
            prevScreenWidth.current = screenWidth;
            return diagramModel;
        }
        const newModel = new DiagramModel();
        newModel.setZoomLevel(zoomLevel);
        newModel.setOffset(offSetX, offSetY);
        const showInputFilterEmpty = !nodes.some(
            node => (node instanceof InputNode && node.getSearchFilteredType()) || node instanceof FocusedInputNode
        );
        if (showInputFilterEmpty) {
            const inputSearchNotFoundNode = new InputNode(undefined, undefined, true);
            inputSearchNotFoundNode.setPosition(OFFSETS.SOURCE_NODE.X, OFFSETS.SOURCE_NODE.Y);
            newModel.addNode(inputSearchNotFoundNode);
        }
        newModel.addAll(...nodes);
        for (const node of nodes) {
            try {
                if (node instanceof InputNode && !node.getSearchFilteredType()) {
                    newModel.removeNode(node);
                    continue;
                }
                node.setModel(newModel);
                await node.initPorts();
                if (node instanceof LinkConnectorNode || node instanceof ArrayFnConnectorNode) {
                    continue;
                }
                node.initLinks();
            } catch (e) {
                // onError(ErrorNodeKind.GENERIC);
                console.error(e);
            }
        }
        newModel.setLocked(true);
        newModel.addLayer(new OverlayLayerModel());
        return newModel;
    };

    const {
        data: updatedModel,
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: [
        'genModel',
        { noOfNodes, focusedSrc, lastView, inputSearch, outputSearch, collapsedObjectFields, expandedArrayFields, screenWidth }
    ], queryFn: () => genModel(), networkMode: 'always'});

    return { updatedModel, isFetching, isError, refetch };
};

export const useSearchScrollReset = (
    diagramModel: DiagramModel<DiagramModelGenerics>
) => {
    const { inputSearch, outputSearch } = useDMSearchStore();
    const prevInSearchTermRef = useRef<string>("");
    const prevOutSearchTermRef = useRef<string>("");

    useEffect(() => {
        const nodes = diagramModel.getNodes() as DataMapperNodeModel[];
        const inputNode = nodes.find((node) => (isInputNode(node) && !(node instanceof SubMappingNode)));
        const subMappingNode = nodes.find((node) => (node instanceof SubMappingNode));
        const outputNode = nodes.find(isOutputNode);

        if (inputNode && prevInSearchTermRef.current != inputSearch) {
            inputNode.setPosition(inputNode.getX(), 0);
            subMappingNode?.setPosition(subMappingNode.getX(), inputNode.height + GAP_BETWEEN_INPUT_NODES);
            prevInSearchTermRef.current = inputSearch;
        }

        if (outputNode && prevOutSearchTermRef.current != outputSearch) {
            outputNode.setPosition(outputNode.getX(), 0);
            prevOutSearchTermRef.current = outputSearch;
        }
        
    }, [diagramModel]);
}
