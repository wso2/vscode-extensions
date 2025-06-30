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

import React from 'react';
import { Position } from 'vscode-languageserver-types';
import { Divider, HelperPane } from '@wso2/ui-toolkit';
import { FunctionsPage } from './FunctionsPage';
import { ConfigsPage } from './ConfigsPage';
import { PAGE, Page } from './index';

type PanelPageProps = {
    setCurrentPage: (page: Page) => void;
};

type CategoryPageProps = {
    position: Position;
    setCurrentPage: (page: Page) => void;
    onClose: () => void;
    onChange: (value: string) => void;
    addFunction?: (value: string) => void;
};

const DataPanel = ({ setCurrentPage }: PanelPageProps) => {
    return (
        <>
            <HelperPane.CategoryItem label="Payload" onClick={() => setCurrentPage(PAGE.PAYLOAD)} />
            <HelperPane.CategoryItem label="Variables" onClick={() => setCurrentPage(PAGE.VARIABLES)} />
            <HelperPane.CategoryItem label="Headers" onClick={() => setCurrentPage(PAGE.HEADERS)} />
            <Divider />
            <HelperPane.CategoryItem label="Params" onClick={() => setCurrentPage(PAGE.PARAMS)} />
            <HelperPane.CategoryItem label="Properties" onClick={() => setCurrentPage(PAGE.PROPERTIES)} />
        </>
    );
};

export const CategoryPage = ({
    position,
    setCurrentPage,
    onChange,
    addFunction
}: CategoryPageProps) => {
    return (
        <>
            <HelperPane.Body>
                <HelperPane.Panels>
                    <HelperPane.PanelTab id={0} title="Data" />
                    <HelperPane.PanelTab id={1} title="Functions" />
                    <HelperPane.PanelTab id={2} title="Configs" />
                    <HelperPane.PanelView id={0}>
                        <DataPanel setCurrentPage={setCurrentPage} />
                    </HelperPane.PanelView>
                    <HelperPane.PanelView id={1}>
                        <FunctionsPage position={position} onChange={onChange} addFunction={addFunction} />
                    </HelperPane.PanelView>
                    <HelperPane.PanelView id={2}>
                        <ConfigsPage position={position} onChange={onChange} />
                    </HelperPane.PanelView>
                </HelperPane.Panels>
            </HelperPane.Body>
        </>
    );
};
