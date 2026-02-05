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
import { BaseNodeModel, BaseNodeData } from '../BaseNode/BaseNodeModel';

export interface PortalNodeData extends BaseNodeData {
    pairedPortalX?: number;
    pairedPortalY?: number;
    gotoLabel?: string;
    gotoX?: number;
    gotoY?: number;
    gotoNodeId?: string;
}

export class PortalNodeModel extends BaseNodeModel {
    declare data: PortalNodeData;

    constructor(node: Node<PortalNodeData>) {
        super(node);
        this.type = 'portalNode';
    }

    getPairedPortalX(): number | undefined {
        return this.data.pairedPortalX;
    }

    getPairedPortalY(): number | undefined {
        return this.data.pairedPortalY;
    }

    setPairedPortal(x: number, y: number): void {
        this.data.pairedPortalX = x;
        this.data.pairedPortalY = y;
    }

    getGotoLabel(): string | undefined {
        return this.data.gotoLabel;
    }

    getGotoX(): number | undefined {
        return this.data.gotoX;
    }

    getGotoY(): number | undefined {
        return this.data.gotoY;
    }

    getGotoNodeId(): string | undefined {
        return this.data.gotoNodeId;
    }
}
