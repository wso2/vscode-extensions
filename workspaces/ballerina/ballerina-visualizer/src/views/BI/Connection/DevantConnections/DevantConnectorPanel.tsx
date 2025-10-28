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

import { FC, useState } from "react";
import { MarketplaceItem } from "@wso2/wso2-platform-core";
import { DevantConnectorMarketplaceInfo } from "./DevantConnectorMarketplaceInfo";
import { PanelContainer } from "@wso2/ballerina-side-panel";
import { DevantConnectorCreateForm } from "./DevantConnectorCreateForm";
import { PlatformExtHooks } from "../../../../PlatformExtHooks";

export const DevantConnectorPanel: FC<{ selectedItem: MarketplaceItem; onClose: (connName: string) => void }> = ({
    selectedItem,
    onClose,
}) => {
    const [showInfo, setShowInfo] = useState(false);
    const selected = PlatformExtHooks.getSelectedContext();
    const directoryComponent = PlatformExtHooks.getDirectoryComp()
    const projectPath = PlatformExtHooks.getProjectPath();

    return (
        <>
            <>
                <PanelContainer
                    show={true}
                    title="Create New Devant Connection"
                    onClose={() => onClose("")}
                    subPanelWidth={600}
                    subPanel={
                        showInfo && (
                            <DevantConnectorMarketplaceInfo
                                onCloseClick={() => setShowInfo(false)}
                                org={selected?.org}
                                item={selectedItem}
                            />
                        )
                    }
                >
                    <DevantConnectorCreateForm
                        component={directoryComponent}
                        item={selectedItem}
                        onCreate={(connName) => onClose(connName)}
                        directoryFsPath={projectPath}
                        org={selected.org}
                        project={selected.project}
                        onShowInfo={() => setShowInfo(true)}
                        isShowingInfo={showInfo}
                    />
                </PanelContainer>
            </>
        </>
    );
};
