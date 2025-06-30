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

// tslint:disable: jsx-no-lambda jsx-no-multiline-js no-unused-expression
import * as React from 'react';

import styled from '@emotion/styled';
import { CanvasEngine, SmartLayerWidget } from '@projectstorm/react-canvas-core'

import { CustomTransformLayerWidget } from "./CustomTransformLayer";

export interface DiagramProps {
    engine: CanvasEngine;
    className?: string;
    disableZoom?: boolean;
    disableMouseEvents?: boolean;
    overflow?: string;
    cursor?: string;
}

// tslint:disable-next-line:no-namespace
namespace S {
    export const Canvas = styled.div<{ cursor: string; overflow: string }>`
      position: relative;
      cursor: ${(props: any) => props.cursor || "move"};
      overflow: ${(props: any) => props.overflow || "unset"};
      height: unset !important;
    `;
}

export class CustomCanvasWidget extends React.Component<DiagramProps> {
    ref: React.RefObject<HTMLDivElement>;
    keyUp: any;
    keyDown: any;
    canvasListener: any;
    selectedNode: any
    isMouseClicked: boolean;

    constructor(props: DiagramProps) {
        super(props);

        this.ref = React.createRef();
        this.state = {
            action: null,
            diagramEngineListener: null
        };
    }

    componentWillUnmount() {
        this.props.engine.deregisterListener(this.canvasListener);
        this.props.engine.setCanvas(null);

        document.removeEventListener('keyup', this.keyUp);
        document.removeEventListener('keydown', this.keyDown);
    }

    registerCanvas() {
        this.props.engine.setCanvas(this.ref.current);
        this.props.engine.iterateListeners(list => {
            list.rendered && list.rendered();
        });
    }

    componentDidUpdate() {
        this.registerCanvas();
    }

    componentDidMount() {
        this.canvasListener = this.props.engine.registerListener({
            repaintCanvas: () => {
                this.forceUpdate();
            }
        });

        this.keyDown = (event: any) => {
            this.props.engine.getActionEventBus().fireAction({ event });
        };
        this.keyUp = (event: any) => {
            this.props.engine.getActionEventBus().fireAction({ event });
        };

        document.addEventListener('keyup', this.keyUp);
        document.addEventListener('keydown', this.keyDown);
        this.registerCanvas();
    }

    render() {
        const engine = this.props.engine;
        const model = engine.getModel();

        return (
            <S.Canvas
                cursor={this.props.cursor}
                overflow={this.props.overflow}
                className={this.props.className}
                ref={this.ref}
                onWheel={event => {
                    if (!this.props.disableZoom) {
                        this.isMouseClicked = false;
                        this.props.engine.getActionEventBus().fireAction({ event });
                    }
                }}
                onMouseDown={event => {
                    if (!this.props.disableMouseEvents) {
                        this.isMouseClicked = true;
                        this.props.engine.getActionEventBus().fireAction({ event });
                    }
                }}
                onMouseUp={event => {
                    if (!this.props.disableMouseEvents) {
                        this.isMouseClicked = true;
                        this.props.engine.getActionEventBus().fireAction({ event });
                    }
                }}
                onMouseMove={event => {
                    if (!this.props.disableMouseEvents) {
                        this.isMouseClicked = false;
                        this.props.engine.getActionEventBus().fireAction({ event });
                    }
                }}
                onTouchStart={event => {
                    this.isMouseClicked = true;
                    this.props.engine.getActionEventBus().fireAction({ event });
                }}
                onTouchEnd={event => {
                    this.isMouseClicked = true;
                    this.props.engine.getActionEventBus().fireAction({ event });
                }}
                onTouchMove={event => {
                    this.isMouseClicked = false;
                    this.props.engine.getActionEventBus().fireAction({ event });
                }}
            >
                {model.getLayers().map(layer => {
                    return (
                        <CustomTransformLayerWidget
                            layer={layer}
                            key={layer.getID()}
                            isMouseClicked={this.isMouseClicked}
                        >
                            <SmartLayerWidget layer={layer} engine={this.props.engine} key={layer.getID()} />
                        </CustomTransformLayerWidget>
                    );
                })}
            </S.Canvas>
        );
    }
}
