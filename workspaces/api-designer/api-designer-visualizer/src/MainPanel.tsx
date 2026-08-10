import React, { useEffect, useState } from 'react';
import { PopupMachineStateValue, MACHINE_VIEW, MachineStateValue } from '@wso2/api-designer-core';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import styled from '@emotion/styled';

const LoaderWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100%;
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

const ViewContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
`;

const MainPanel = ({ handleResetError }: { handleResetError: () => void }) => {
    const { rpcClient } = useVisualizerContext();
    const [viewComponent, setViewComponent] = useState<React.ReactNode>();
    const [showAIWindow, setShowAIWindow] = useState<boolean>(false);
    const [machineView, setMachineView] = useState<MACHINE_VIEW>();
    const [showNavigator, setShowNavigator] = useState<boolean>(true);
    const [formState, setFormState] = useState<PopupMachineStateValue>('initialize');
    const [stateUpdated, setStateUpdated] = React.useState<boolean>(false);
    const [refreshTrigger, setRefreshTrigger] = React.useState<number>(0);
    const [currentDocumentUri, setCurrentDocumentUri] = React.useState<string>('');

    rpcClient?.onStateChanged((newState: MachineStateValue) => {
        if (typeof newState === 'object' && 'newProject' in newState && newState.newProject === 'viewReady') {
            setStateUpdated(!stateUpdated);
        }
        if (typeof newState === 'object' && 'ready' in newState && newState.ready === 'viewReady') {
            handleResetError();
            setStateUpdated(!stateUpdated);
        }
        // Trigger a refresh whenever state changes to catch documentUri updates
        setRefreshTrigger(prev => prev + 1);
    });

    rpcClient?.onPopupStateChanged((newState: PopupMachineStateValue) => {
        setFormState(newState);
    });

    useEffect(() => {
        fetchContext();
    }, [stateUpdated, refreshTrigger]);

    // Poll for documentUri changes every 200ms to catch updates quickly
    useEffect(() => {
        const checkDocumentUri = () => {
            rpcClient?.getVisualizerState().then((machineView) => {
                if (machineView.documentUri && machineView.documentUri !== currentDocumentUri) {
                    // Document URI changed, trigger immediate refresh
                    // Document URI changed - handled by file change notifications
                    setCurrentDocumentUri(machineView.documentUri);
                    setRefreshTrigger(prev => prev + 1);
                }
            });
        };

        // Check immediately on mount
        checkDocumentUri();

        // Then poll regularly
        const interval = setInterval(checkDocumentUri, 200);

        return () => clearInterval(interval);
    }, [currentDocumentUri, rpcClient]);

    useEffect(() => {
        rpcClient?.getVisualizerState().then((machineView) => {
            setMachineView(machineView.view ?? undefined);
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
        rpcClient?.getVisualizerState().then(async (machineView) => {
            let shouldShowNavigator = true;
            switch (machineView?.view) {
                case MACHINE_VIEW.Overview:
                    // setViewComponent(<Overview stateUpdated />);
                    break;
                case MACHINE_VIEW.Welcome:
                    // Use key prop to force remount when fileUri changes
                    // setViewComponent(
                    //     <HomePage
                    //         key={machineView.documentUri}
                    //         fileUri={machineView.documentUri}
                    //         launchIntent={machineView.identifier}
                    //     />
                    // );
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
