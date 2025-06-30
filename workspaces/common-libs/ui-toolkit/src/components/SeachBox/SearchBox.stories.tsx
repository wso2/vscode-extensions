/*
 *  Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 *  This software is the property of WSO2 LLC. and its suppliers, if any.
 *  Dissemination of any information or reproduction of any material contained
 *  herein is strictly forbidden, unless permitted by WSO2 in accordance with
 *  the WSO2 Commercial License available at http://wso2.com/licenses.
 *  For specific language governing the permissions and limitations under
 *  this license, please see the license as well as any agreement you’ve
 *  entered into with WSO2 governing the purchase of this software and any
 *  associated services.
 */
import { Meta, StoryObj } from "@storybook/react-vite";
import { SearchBox } from "./SearchBox";

const meta: Meta<typeof SearchBox> = {
    component: SearchBox,
    title: "SearchBox",
};
export default meta;

type Story = StoryObj<typeof SearchBox>;

export const Default: Story = {
    args: {
        label: "Search",
        autoFocus: true,
        placeholder: "placeholder",
        onChange: (text: string) => console.log({ text }),
    },
};
