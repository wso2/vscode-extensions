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

import React, { useEffect } from 'react';
import { ColorThemeKind, WorkspaceFolder } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { View, ViewContent, ViewHeader } from '../../components/View';
import { VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  padding: 0 32px;
  gap: 32px;

  * {
    box-sizing: border-box;
  }
`;

const Block = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Steps = styled.div`
  display: grid;
  grid-template-columns: 5fr 8fr;
  column-gap: 32px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
    row-gap: 32px;
  }
`;

const Headline = styled.div`
  font-size: 26px;
  font-weight: 400;
  white-space: nowrap;
  padding-bottom: 10px;
`;

const SubTitle = styled.div`
  font-weight: 400;
  margin-top: 0;
  margin-bottom: 5px;
  font-size: 1.5em;
  line-height: normal;
`;

const Body = styled(Typography)`
  color: var(--vscode-descriptionForeground);
`;

const CardContainer = styled(Block)`
  min-height: 400px;

  @media (max-width: 768px) {
    min-height: 200px;
  }
`;

const CardCollapsed = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
  height: 48px;
  padding: 4px 16px;
  border-radius: 6px;
  cursor: pointer;
  :hover {
    background-color: var(--vscode-welcomePage-tileHoverBackground);
  }
`;

const CardExpanded = styled.div`
  width: 100%;
  border: 1px solid var(--vscode-focusBorder);
  border-radius: 6px;
  padding: 16px;
  background-color: var(--vscode-welcomePage-tileBackground);
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  flex-wrap: wrap;
`;

const CardTitle = styled(Typography)`
  color: var(--vscode-walkthrough-stepTitle-foreground);
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: auto;
`;

interface CardProps {
  title: string;
  description: string;
  expanded: boolean;
  onClick: () => void;
}

interface ImageProps {
  src: { Light: any; Dark: any };
  alt: string;
}

export interface UnsupportedProjectProps {
  // Whether to display the overview on startup
  displayOverview?: boolean;
};

const Card: React.FC<CardProps> = ({ title, description, expanded, onClick }) => {
  return (
    <React.Fragment>
      {expanded ? (
        <CardExpanded>
          <CardContent>
            <CardTitle variant='body3' sx={{ fontWeight: 600 }}>
              {title}
            </CardTitle>
            <Typography variant='body3'>{description}</Typography>
          </CardContent>
        </CardExpanded>
      ) : (
        <CardCollapsed onClick={onClick}>
            <CardTitle variant='body3' sx={{ fontWeight: 600 }}>
              {title}
            </CardTitle>
        </CardCollapsed>
      )}
    </React.Fragment>
  );
};

export function UnsupportedProject(props: UnsupportedProjectProps) {
  const { displayOverview = true } = props;
  const { rpcClient } = useVisualizerContext();
  const [activeWorkspaces, setActiveWorkspaces] = React.useState<WorkspaceFolder>(undefined);
  const [activeCard, setActiveCard] = React.useState<number>(0);
  const [currentThemeKind, setCurrentThemeKind] = React.useState<ColorThemeKind>(undefined);
  const [displayOverviewOnStartup, setDisplayOverviewOnStartup] = React.useState<boolean>(displayOverview);

  const cards = [
    {
      title: 'Open Graphical View',
      description: 'Click on the circled button to open the graphical view for the artifact.',
    },
    {
      title: 'Diagram View',
      description: 'Diagram View can be used to view and edit resource, sequence, and proxies.',
    },
    {
      title: 'Service Designer',
      description: 'Service Designer can be used to view and edit your services and resources.',
    },
  ];

  const imageInfo = [
    {
      src: {
        Light: require('../../../assets/images/open-graphical-view-light.png'),
        Dark: require('../../../assets/images/open-graphical-view-dark.png'),
      },
      alt: 'Open Diagram',
    },
    {
      src: {
        Light: require('../../../assets/images/diagram-view-light.png'),
        Dark: require('../../../assets/images/diagram-view-dark.png'),
      },
      alt: 'Diagram View',
    },
    {
      src: {
        Light: require('../../../assets/images/service-designer-light.png'),
        Dark: require('../../../assets/images/service-designer-dark.png'),
      },
      alt: 'Service Designer',
    },
  ];

  const disableOverview = async () => {
    await rpcClient.getMiVisualizerRpcClient().toggleDisplayOverview({
      displayOverview: !displayOverviewOnStartup,
    });
    setDisplayOverviewOnStartup(!displayOverviewOnStartup);
  };

  useEffect(() => {
    rpcClient
      .getMiVisualizerRpcClient()
      .getWorkspaces()
      .then(response => {
        setActiveWorkspaces(response.workspaces[0]);
      });
  }, []);

  // Set current theme
  useEffect(() => {
    if (rpcClient) {
      void (async () => {
        const kind = await rpcClient.getMiVisualizerRpcClient().getCurrentThemeKind();
        setCurrentThemeKind(kind);
      })();
      rpcClient.onThemeChanged((kind: ColorThemeKind) => {
        setCurrentThemeKind(kind);
      });
    }
  }, [rpcClient]);

  const getImageForTheme: React.FC<ImageProps> = (image) => {
    switch (currentThemeKind) {
      case ColorThemeKind.Light:
        return <img src={image.src.Light} alt={image.alt} />
      case ColorThemeKind.HighContrastLight:
        return <img src={image.src.Light} alt={image.alt} />
      default:
        return <img src={image.src.Dark} alt={image.alt} />
    }
  };

  const images = React.useMemo(() => {
    return imageInfo.map((image) => getImageForTheme(image));
  }, [currentThemeKind])

  return (
    <View>
      <ViewHeader title={'Project: ' + activeWorkspaces?.name} icon='project' iconSx={{ fontSize: "15px" }} />
      <ViewContent padding>
        <Container>
          <Block>
            <Headline>Unsupported Project Detected</Headline>
            <Body variant='body3'>
              This project was identified as being created with Integration Studio. The MI VSCode extension has limited
              functionality for these projects.
            </Body>
            <Body variant='body3'>
              We recommend migrating your project to the latest format to unlock the full suite of features available.
              For more information, refer to the{' '}
              <a href='https://ei.docs.wso2.com' target='_blank' rel='noopener noreferrer'>
                migration documentation
              </a>
              .
            </Body>
          </Block>
          <Steps>
            <CardContainer>
              <SubTitle>Working with Integration Studio Projects</SubTitle>
              {cards.map((card, index) => (
                <Card
                  key={card.title}
                  title={card.title}
                  description={card.description}
                  expanded={index === activeCard}
                  onClick={() => setActiveCard(index)}
                />
              ))}
            </CardContainer>
            <Block>
              {images.map((image, index) => {
                return (
                  <React.Fragment key={index}>
                    {index === activeCard && image}
                  </React.Fragment>
                );
              })}
            </Block>
          </Steps>
          <Footer>
            <VSCodeCheckbox value='display-overview' checked={displayOverviewOnStartup} onClick={disableOverview}>
                Show overview page on startup
            </VSCodeCheckbox>
          </Footer>
        </Container>
      </ViewContent>
    </View>
  );
}

