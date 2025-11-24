import { Codicon, Drawer, ProgressRing, Typography } from '@wso2/ui-toolkit';
import React, { useEffect, useState, useContext, ReactNode } from 'react';
import styled from '@emotion/styled';
import { DiagramService, Range } from '@wso2/mi-syntax-tree/lib/src';
import SidePanelContext, { SidePanelPage } from './SidePanelContexProvider';
import { HomePage } from './mediators';
import { getAllDataServiceForms } from './mediators/Values';
import { FirstCharToUpperCase } from '../../utils/commons';
import ExpressionEditor from './expressionEditor/ExpressionEditor';
import { ExpressionFieldValue } from '../..';
import { DATA_SERVICE_NODES } from '../../resources/constants';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { getMediatorIconsFromFont } from '../../resources/icons/mediatorIcons/icons';
import { MediatorPage } from './mediators/Mediator';

const SidePanelContainer = styled.div`
    padding: 20px;

    *{font-family: var(--font-family)}
`;

const LoaderContainer = styled.div`
    align-items: center;
    display: flex;
    flex-direction: row;
    justify-content: center;
    height: 100vh;
    width: 100%;
`;

const ButtonContainer = styled.div`
    display: flex;
    justify-content: center;
    gap: 10px;
    align-items: center;
    height: 30px;
`;

const ContentContainer = styled.div`
    height: calc(100vh - 50px);
    overflow-y: auto;
`;

const IconContainer = styled.div`
    width: 40px;

    & img {
        width: 25px;
    }
`;

export interface SidePanelListProps {
    nodePosition: Range;
    trailingSpace: string;
    documentUri: string;
    artifactModel: DiagramService;
}

export const sidepanelAddPage = (sidePanelContext: SidePanelContext, content: any, title?: string, icon?: string | ReactNode) => {
    sidePanelContext.setSidePanelState({
        ...sidePanelContext,
        pageStack: sidePanelContext?.pageStack?.length > 0 ? [...sidePanelContext.pageStack, { content, title, isOpen: true, icon }] : [{ content, title, isOpen: true, icon }],
    });
}

export const sidepanelGoBack = (sidePanelContext: SidePanelContext, count: number = 1) => {
    if (sidePanelContext.pageStack.length > 0 && sidePanelContext.pageStack.length > count) {
        const pageStack = sidePanelContext.pageStack;
        pageStack[pageStack.length - count] = {
            ...pageStack[pageStack.length - count],
            isOpen: false,
            title: undefined,
            icon: undefined,
        };

        sidePanelContext.setSidePanelState({
            ...sidePanelContext,
            pageStack,
        });

        // remove the last page from the stack after it is closed
        setTimeout(() => {
            const pageStack = sidePanelContext.pageStack;
            pageStack.pop();
            sidePanelContext.setSidePanelState({
                ...sidePanelContext,
                pageStack,
            });
        }, 200);
    }
};

export const handleOpenExprEditor = (value: ExpressionFieldValue, setValue: any, handleOnCancelExprEditorRef: any, sidePanelContext: SidePanelContext) => {
    const content = <ExpressionEditor
        value={value}
        handleOnSave={(value) => {
            setValue(value);
            handleOnCancelExprEditorRef.current();
        }}
        handleOnCancel={() => {
            handleOnCancelExprEditorRef.current();
        }}
    />;
    sidepanelAddPage(sidePanelContext, content, "Expression Editor");
}

const SidePanelList = (props: SidePanelListProps) => {
    const [isLoading, setLoading] = useState<boolean>(true);
    const sidePanelContext = useContext(SidePanelContext);
    const { rpcClient } = useVisualizerContext();

    useEffect(() => {
        setLoading(sidePanelContext.pageStack == undefined);
    }, [sidePanelContext.pageStack]);

    useEffect(() => {
        const fetchMediators = async () => {
            setLoading(true);

            if (sidePanelContext.isEditing && sidePanelContext.operationName) {
                if (sidePanelContext.operationName === "connector") {
                    const page = <MediatorPage
                        connectorData={{
                            form: sidePanelContext.formValues.form,
                            connectorName: sidePanelContext.formValues.connectorName,
                            operationName: sidePanelContext.formValues.operationName,
                        }}
                        mediatorType={sidePanelContext.tag}
                        isUpdate={true}
                        documentUri={props.documentUri}
                        nodeRange={props.nodePosition}
                        showForm={true}
                        artifactModel={props.artifactModel}
                    />;
                    sidepanelAddPage(sidePanelContext, page, `Edit ${FirstCharToUpperCase(sidePanelContext.formValues.title)}`, sidePanelContext.formValues.icon);
                } else if (Object.values(DATA_SERVICE_NODES).includes(sidePanelContext.operationName)) {
                    const allForms = getAllDataServiceForms({
                        nodePosition: props.nodePosition,
                        trailingSpace: props.trailingSpace,
                        documentUri: props.documentUri,
                    });

                    const form = allForms.find(form => form.operationName.toLowerCase() === sidePanelContext.operationName?.toLowerCase());
                    if (form) {
                        sidepanelAddPage(sidePanelContext, form.form, `Edit ${form.title}`);
                    }
                } else {
                    const isStartNode = sidePanelContext.operationName === "startNode";

                    const mediatorDetails = isStartNode ? undefined : await rpcClient.getMiDiagramRpcClient().getMediator({
                        mediatorType: sidePanelContext.tag,
                        range: sidePanelContext?.nodeRange,
                        documentUri: props?.documentUri,
                        isEdit: true
                    });

                    const title = isStartNode ? undefined : `Edit ${mediatorDetails?.title || sidePanelContext.tag}`;
                    const icon = isStartNode ? undefined : getMediatorIconsFromFont(sidePanelContext.tag, false);
                    const page = <MediatorPage
                        mediatorData={mediatorDetails}
                        mediatorType={sidePanelContext.tag}
                        isUpdate={true}
                        documentUri={props.documentUri}
                        nodeRange={props.nodePosition}
                        showForm={!isStartNode}
                        artifactModel={props.artifactModel}
                    />;
                    sidepanelAddPage(sidePanelContext, page, title, icon);
                }
            } else {
                const home = <HomePage nodePosition={props.nodePosition} trailingSpace={props.trailingSpace} documentUri={props.documentUri} artifactModel={props.artifactModel} />;
                sidepanelAddPage(sidePanelContext, home);
            }
            setLoading(false);
        }
        fetchMediators();
    }, []);

    const handleClose = () => {
        sidePanelContext.setSidePanelState({
            isOpen: false,
            isEditing: false,
            formValues: {},
            connectors: sidePanelContext.connectors,
            pageStack: [],
        });
    };

    const Icon = () => {
        if (sidePanelContext.pageStack.length > 0) {
            const lastPage = sidePanelContext.pageStack[sidePanelContext.pageStack.length - 1];
            if (lastPage.icon !== undefined) {
                if (typeof lastPage.icon === "string") {
                    return (
                        <IconContainer>
                            <img src={lastPage.icon} alt="Icon" />
                        </IconContainer>
                    );
                } else if (React.isValidElement(lastPage.icon)) {
                    return <div style={{ width: 40 }}>{lastPage.icon}</div>;
                }
            }
        }
        return null;
    };

    const Title = () => {
        if (sidePanelContext.pageStack.length > 0) {
            const lastPage = sidePanelContext.pageStack[sidePanelContext.pageStack.length - 1];
            return lastPage.title !== undefined && 
            <Typography variant='h3' sx={{ textAlign: "center", width: "fit-content" }}>
                <div style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} >
                    {lastPage.title}
                </div>
            </Typography>;
        }
    }

    return (
        <SidePanelContainer data-testid="sidepanel">
            {isLoading ? <LoaderContainer data-testid="sidepanel-loader">
                < ProgressRing />

            </LoaderContainer > :
                <>
                    {/* Header */}
                    <ButtonContainer>
                        {sidePanelContext.pageStack.length > 1 && sidePanelContext.pageStack[sidePanelContext.pageStack.length - 1].isOpen &&
                            <Codicon name="arrow-left" sx={{ width: "20px", position: "absolute", left: "0px", paddingLeft: "20px" }} onClick={() => sidepanelGoBack(sidePanelContext)} />}

                        <Icon />
                        <Title />
                        <Codicon name="close" sx={{ textAlign: "right", width: "20px", position: "absolute", right: "0px", paddingRight: "16px" }} onClick={handleClose} />
                    </ButtonContainer>

                    {/* Content */}
                    <div style={{ marginBottom: "30px" }}>
                        {
                            sidePanelContext.pageStack.map((page: SidePanelPage, index) => {
                                if (index === 0) {
                                    return (
                                        <ContentContainer key={index}>
                                            {page.content}
                                        </ContentContainer>
                                    )
                                }
                                return <Drawer
                                    isOpen={page.isOpen}
                                    id={`drawer${index}`}
                                    width={300}
                                    isSelected={page.isOpen}
                                    sx={{
                                        width: "100%",
                                        top: "45px",
                                        border: "none",
                                        boxShadow: "none",
                                        height: "calc(100vh - 50px)",
                                        overflowY: "scroll",
                                        scrollbarWidth: "thin",
                                    }}
                                >
                                    {page.content}
                                </Drawer>
                            })
                        }
                    </div>
                </>}
        </SidePanelContainer>
    );
};

export default SidePanelList;
