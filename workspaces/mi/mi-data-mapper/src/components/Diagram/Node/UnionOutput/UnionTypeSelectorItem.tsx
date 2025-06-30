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

import React, { useState } from 'react';

import { DMType } from '@wso2/mi-core';
import { Icon, ProgressRing, Tooltip, Typography } from '@wso2/ui-toolkit';
import { useIONodesStyles } from '../../../styles';
import styled from '@emotion/styled';

const ItemContainer = styled.div`
	
`;

export interface UnionTypeSelectorItemProps {
	dmType: DMType;
	onHandleSelect: (resolvedUnionType: DMType) => Promise<void>;
}

export function UnionTypeSelectorItem(props: UnionTypeSelectorItemProps) {
	const { dmType, onHandleSelect } = props;
	const [isAddingTypeCast, setIsAddingTypeCast] = useState(false);
	const classes = useIONodesStyles();

	const onClickOnListItem = async () => {
		setIsAddingTypeCast(true)
		await onHandleSelect(dmType);
	};

	return (
		<Tooltip
			content={`Initialize as ${dmType.typeName}`}
			position="right"
		>
			<div
				onMouseDown={onClickOnListItem}
				className={classes.treeLabel}
			>
				{isAddingTypeCast ? (
					<ProgressRing />
				) : (
					<Icon
						name="symbol-struct-icon"
						sx={{ height: "15px", width: "15px"}}
					/>
				)}
				<Typography variant="h4" className={classes.label} sx={{ margin: "0 0 0 6px" }} >
					{dmType.typeName}
				</Typography>
			</div>
		</Tooltip>
	);

}
