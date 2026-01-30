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

import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import {
	ChoreoComponentType,
	type ComponentConfig,
	type ComponentSelectionItem,
	getIntegrationComponentTypeText,
} from "@wso2/wso2-platform-core";
import React, { type FC } from "react";
import { Banner } from "../../../components/Banner";

/** Available component types for the type picker */
const COMPONENT_TYPE_OPTIONS = [
	{ value: ChoreoComponentType.Service, label: "Service" },
	{ value: ChoreoComponentType.WebApplication, label: "Web Application" },
	{ value: ChoreoComponentType.ScheduledTask, label: "Scheduled Task" },
	{ value: ChoreoComponentType.ManualTrigger, label: "Manual Task" },
	{ value: ChoreoComponentType.Webhook, label: "Webhook" },
	{ value: ChoreoComponentType.EventHandler, label: "Event Handler" },
	{ value: ChoreoComponentType.TestRunner, label: "Test Runner" },
];

interface MultiComponentSelectorProps {
	extensionName?: string;
	allComponents: ComponentConfig[];
	selectedComponents: ComponentSelectionItem[];
	onComponentSelectionChange: (updated: ComponentSelectionItem[]) => void;
}

export const MultiComponentSelector: FC<MultiComponentSelectorProps> = ({
	extensionName,
	allComponents,
	selectedComponents,
	onComponentSelectionChange,
}) => {
	/** Handle checkbox change for a component */
	const handleComponentToggle = (index: number, checked: boolean) => {
		const updated = selectedComponents.map((comp) => (comp.index === index ? { ...comp, selected: checked } : comp));
		onComponentSelectionChange(updated);
	};

	/** Handle component type change for a component */
	const handleComponentTypeChange = (index: number, newType: string) => {
		const updated = selectedComponents.map((comp) => (comp.index === index ? { ...comp, componentType: newType } : comp));
		onComponentSelectionChange(updated);
	};

	const hasSelectedComponents = selectedComponents.some((comp) => comp.selected);

	return (
		<div className="mb-6">
			<div className="mb-3 flex items-center justify-between">
				<label className="block text-sm font-medium text-vsc-foreground">
					Select Components to {extensionName === "Devant" ? "Deploy" : "Create"}
				</label>
				<span className="text-xs text-vsc-descriptionForeground">
					{selectedComponents.filter((c) => c.selected).length} of {allComponents.length} selected
				</span>
			</div>
			<div className="rounded-md border border-vsc-input-border bg-vsc-editor-background">
				{allComponents.map((component, index) => {
					const selectionItem = selectedComponents.find((c) => c.index === index);
					const isSelected = selectionItem?.selected ?? false;
					const currentType = selectionItem?.componentType || component.initialValues?.type || ChoreoComponentType.Service;

					return (
						<div
							key={`component-${index}-${component.directoryName}`}
							className={`flex items-center gap-4 border-b border-vsc-input-border p-3 last:border-b-0 ${
								isSelected ? "bg-vsc-list-hoverBackground" : ""
							}`}
						>
							<VSCodeCheckbox
								className="shrink-0"
								checked={isSelected}
								onChange={(e: any) => handleComponentToggle(index, e.target.checked)}
							>
								<div className="flex flex-col">
									<span className="font-medium text-vsc-foreground">{component.initialValues?.name || component.directoryName}</span>
									<span className="text-xs text-vsc-descriptionForeground">{component.directoryName}</span>
								</div>
							</VSCodeCheckbox>
							<div className="ml-auto flex items-center gap-2">
								<label className="text-xs text-vsc-descriptionForeground">Type:</label>
								<select
									className="rounded border border-vsc-input-border bg-vsc-input-background px-2 py-1 text-sm text-vsc-foreground"
									value={currentType}
									onChange={(e) => handleComponentTypeChange(index, e.target.value)}
									disabled={!isSelected}
								>
									{COMPONENT_TYPE_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{extensionName === "Devant" ? getIntegrationComponentTypeText(opt.value, "") : opt.label}
										</option>
									))}
								</select>
							</div>
						</div>
					);
				})}
			</div>
			{!hasSelectedComponents && (
				<Banner type="warning" className="mt-3" title="Please select at least one component to proceed." />
			)}
		</div>
	);
};
