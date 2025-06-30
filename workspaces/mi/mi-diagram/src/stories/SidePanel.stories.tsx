import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import SidePanelList, { SidePanelListProps } from "../components/sidePanel";

export default {
    title: "SidePanel/Main",
    component: SidePanelList,
} as Meta;

const Template: StoryFn<SidePanelListProps> = (args: JSX.IntrinsicAttributes & SidePanelListProps) => <SidePanelList {...args} />;

export const Primary = Template.bind({});
Primary.args = {
    nodePosition: {},
    documentUri: ""
};
