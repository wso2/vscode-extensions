import React, { useEffect, useState } from 'react';
import { PopupMachineStateValue, MACHINE_VIEW, MachineStateValue } from '@wso2/arazzo-designer-core';
import { useVisualizerContext } from '@wso2/arazzo-designer-rpc-client';
import styled from '@emotion/styled';
import { Overview } from './views/Overview/Overview';
import { WorkflowView } from './views/WorkflowView/WorkflowView';

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
    const isWorkflowPanel = (window as any).__isWorkflowPanel || false;

    rpcClient?.onStateChanged((newState: MachineStateValue) => {
        if (typeof newState === 'object' && 'newProject' in newState && newState.newProject === 'viewReady') {
            setStateUpdated((prev) => !prev);
        }
        if (typeof newState === 'object' && 'ready' in newState && (newState.ready === 'viewReady' || newState.ready === 'viewEditing')) {
            handleResetError();
            setStateUpdated((prev) => !prev);
        }
        // Always refresh the view on state changes to pick up navigation updates
        fetchContext();
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
            
            // Determine which view to render based on panel identity
            // Overview panel always renders Overview, Workflow panel renders the global state view
            const viewToRender = isWorkflowPanel ? machineView?.view : MACHINE_VIEW.Overview;
            
            switch (viewToRender) {
                case MACHINE_VIEW.Overview:
                    setViewComponent(<Overview fileUri={machineView.documentUri} />);
                    break;
                case MACHINE_VIEW.Workflow:
                    setViewComponent(<WorkflowView key={machineView.identifier} fileUri={machineView.documentUri} workflowId={machineView.identifier} />);
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
