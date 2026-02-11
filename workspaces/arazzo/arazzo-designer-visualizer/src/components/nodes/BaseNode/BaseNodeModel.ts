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

import { Node } from '@xyflow/react';

/**
 * BaseNodeData - Common data structure for all node types
 * Compatible with React Flow's Node<T> type and Visitor patterns
 */
export interface BaseNodeData {
    label: string;
    description?: string;
    width?: number;
    height?: number;
    disabled?: boolean;
    hasError?: boolean;
    errorMessage?: string;
    iconClass?: string;
    iconSize?: number;
    flash?: boolean;
    // Add any properties that Visitors need to access/modify
    visitedByPositionVisitor?: boolean;
    visitedBySizingVisitor?: boolean;
}

/**
 * BaseNodeModel - Data model for node state
 * Provides a structured interface that Visitors can interact with
 */
export class BaseNodeModel {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: BaseNodeData;
    
    constructor(node: Node<BaseNodeData>) {
        this.id = node.id;
        this.type = node.type || 'default';
        this.position = node.position;
        this.data = node.data;
    }
    
    // Getters for Visitor compatibility
    getWidth(): number {
        return this.data.width || 180;
    }
    
    getHeight(): number {
        return this.data.height || 80;
    }
    
    getX(): number {
        return this.position.x;
    }
    
    getY(): number {
        return this.position.y;
    }
    
    // Setters for Visitor compatibility
    setWidth(width: number): void {
        this.data.width = width;
    }
    
    setHeight(height: number): void {
        this.data.height = height;
    }
    
    setPosition(x: number, y: number): void {
        this.position = { x, y };
    }
    
    // Convert back to React Flow Node format
    toReactFlowNode(): Node<BaseNodeData> {
        return {
            id: this.id,
            type: this.type,
            position: this.position,
            data: this.data,
        };
    }
}
