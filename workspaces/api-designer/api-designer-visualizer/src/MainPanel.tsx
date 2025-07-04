import React, { useEffect, useState } from 'react';
import { PopupMachineStateValue, MACHINE_VIEW, MachineStateValue } from '@wso2/api-designer-core';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import styled from '@emotion/styled';
import { APIDesignerView } from './views/APIDesignerView/APIDesigner';

const LoaderWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 50vh;
    width: 100vw;
`;

const PopUpContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2100;
    background: var(--background);
`;

const ViewContainer = styled.div({});

const MainPanel = ({ handleResetError }: { handleResetError: () => void }) => {
    const { rpcClient } = useVisualizerContext();
    const [viewComponent, setViewComponent] = useState<React.ReactNode>();
    const [showAIWindow, setShowAIWindow] = useState<boolean>(false);
    const [machineView, setMachineView] = useState<MACHINE_VIEW>();
    const [showNavigator, setShowNavigator] = useState<boolean>(true);
    const [formState, setFormState] = useState<PopupMachineStateValue>('initialize');
    const [stateUpdated, setStateUpdated] = React.useState<boolean>(false);

    rpcClient?.onStateChanged((newState: MachineStateValue) => {
        if (typeof newState === 'object' && 'newProject' in newState && newState.newProject === 'viewReady') {
            setStateUpdated(!stateUpdated);
        }
        if (typeof newState === 'object' && 'ready' in newState && newState.ready === 'viewReady') {
            handleResetError();
            setStateUpdated(!stateUpdated);
        }
    });

    rpcClient?.onPopupStateChanged((newState: PopupMachineStateValue) => {
        setFormState(newState);
    });

    useEffect(() => {
        fetchContext();
    }, [stateUpdated]);

    useEffect(() => {
        rpcClient.getVisualizerState().then((machineView) => {
            setMachineView(machineView.view);
            if (viewComponent && machineView.view == MACHINE_VIEW.Overview) {
                setShowAIWindow(true);
            }
        });
    }, [viewComponent]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'i' && (event.metaKey || event.ctrlKey)) {
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Cleanup function to remove the event listener when the component unmounts
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const fetchContext = () => {
        rpcClient.getVisualizerState().then(async (machineView) => {
            let shouldShowNavigator = true;
            switch (machineView?.view) {
                case MACHINE_VIEW.Overview:
                    // setViewComponent(<Overview stateUpdated />);
                    break;
                case MACHINE_VIEW.Welcome:
                    setViewComponent(<APIDesignerView fileUri={machineView.documentUri}/>);
                    break;
                default:
                    setViewComponent(null);
            }
            // Update the showNavigator state based on the current view
            setShowNavigator(shouldShowNavigator);
        });
    }
    return (
        <ViewContainer>
            {!viewComponent ? (
                <LoaderWrapper>
                </LoaderWrapper>
            ) : <>
                {/* {showNavigator && <NavigationBar />} */}
                {viewComponent}
            </>}
        </ViewContainer>
    );
};

export default MainPanel;   
