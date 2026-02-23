/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { VSCodeCheckbox, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import classNames from "classnames";
import {
	ChoreoBuildPackNames,
	ChoreoComponentType,
	type ComponentConfig,
	type ComponentSelectionItem,
	DevantScopes,
	getIntegrationComponentTypeText,
	getIntegrationScopeText,
} from "@wso2/wso2-platform-core";
import { Icon } from "@wso2/ui-toolkit";
import React, { type FC, useMemo, useState } from "react";
import { Banner } from "../../../components/Banner";
import { Codicon } from "../../../components/Codicon";
import { getIntegrationTypeColor, getIntegrationTypeIcon, getTypeChipStyle } from "../../../utilities/integration-type-styles";
import { componentNameSchema } from "../componentFormSchema";

/** Available component types for the type picker (Choreo) */
const COMPONENT_TYPE_OPTIONS = [
	{ value: ChoreoComponentType.Service, label: "Service" },
	{ value: ChoreoComponentType.WebApplication, label: "Web Application" },
	{ value: ChoreoComponentType.ScheduledTask, label: "Scheduled Task" },
	{ value: ChoreoComponentType.ManualTrigger, label: "Manual Task" },
	{ value: ChoreoComponentType.Webhook, label: "Webhook" },
	{ value: ChoreoComponentType.EventHandler, label: "Event Handler" },
	{ value: ChoreoComponentType.TestRunner, label: "Test Runner" },
];

/** Buildpacks that only support a single component type (WebApplication) */
const SINGLE_TYPE_BUILDPACKS = [
	ChoreoBuildPackNames.React,
	ChoreoBuildPackNames.Angular,
	ChoreoBuildPackNames.Vue,
	ChoreoBuildPackNames.StaticFiles,
];

/** Get the supported component types for a given buildpack (fallback when no supportedIntegrationTypes provided) */
const getSupportedTypesForBuildpack = (buildPackLang?: string): typeof COMPONENT_TYPE_OPTIONS => {
	if (!buildPackLang) {
		return COMPONENT_TYPE_OPTIONS; // All types if no buildpack detected
	}

	// Web app buildpacks only support WebApplication
	if (SINGLE_TYPE_BUILDPACKS.includes(buildPackLang as ChoreoBuildPackNames)) {
		return COMPONENT_TYPE_OPTIONS.filter((opt) => opt.value === ChoreoComponentType.WebApplication);
	}

	// All other buildpacks support multiple types
	return COMPONENT_TYPE_OPTIONS;
};

/** Get supported types from component config (priority) or fall back to buildpack detection */
const getSupportedTypesForComponent = (
	component: ComponentConfig,
): { value: string; label: string }[] => {
	// If component has explicit supported types from source analysis, use those
	if (component.supportedIntegrationTypes && component.supportedIntegrationTypes.length > 0) {
		return component.supportedIntegrationTypes.map((type) => ({
			value: type,
			label: type, // Label will be transformed via getIntegrationComponentTypeText for Devant
		}));
	}

	// Fallback to buildpack-based detection
	return getSupportedTypesForBuildpack(component.initialValues?.buildPackLang);
};

/**
 * Validate component name using the shared zod schema
 * @returns Error message if invalid, undefined if valid
 */
const validateComponentName = (name: string): string | undefined => {
	const result = componentNameSchema.safeParse(name);
	if (!result.success) {
		return result.error.issues[0]?.message;
	}
	return undefined;
};

interface MultiComponentSelectorProps {
	extensionName?: string;
	allComponents: ComponentConfig[];
	selectedComponents: ComponentSelectionItem[];
	onComponentSelectionChange: (updated: ComponentSelectionItem[]) => void;
	notPushedComponentIndices?: number[];
}

export const MultiComponentSelector: FC<MultiComponentSelectorProps> = ({
	extensionName,
	allComponents,
	selectedComponents,
	onComponentSelectionChange,
	notPushedComponentIndices,
}) => {
	// Track which component names are being edited
	const [editingIndex, setEditingIndex] = useState<number | null>(null);

	/** Compute validation errors for all components - runs whenever selectedComponents changes */
	const validationErrors = useMemo(() => {
		const errors: Record<number, string> = {};
		selectedComponents.forEach((comp) => {
			const error = validateComponentName(comp.name);
			if (error) {
				errors[comp.index] = error;
			}
		});
		return errors;
	}, [selectedComponents]);

	/** Get count of selected components with errors */
	const selectedComponentsWithErrors = useMemo(() => {
		return selectedComponents.filter((comp) => comp.selected && validationErrors[comp.index]);
	}, [selectedComponents, validationErrors]);

	/** Handle checkbox change for a component */
	const handleComponentToggle = (index: number, checked: boolean) => {
		// Prevent deselecting library components
		const component = selectedComponents.find((c) => c.index === index);
		if (component?.componentType === "library" && !checked) {
			return; // Library components cannot be deselected
		}
		
		// Close editing if deselecting the component being edited
		if (!checked && editingIndex === index) {
			setEditingIndex(null);
		}
		const updated = selectedComponents.map((comp) => (comp.index === index ? { ...comp, selected: checked } : comp));
		onComponentSelectionChange(updated);
	};

	/** Handle component type change for a component */
	const handleComponentTypeChange = (index: number, newType: string) => {
		const updated = selectedComponents.map((comp) => (comp.index === index ? { ...comp, componentType: newType } : comp));
		onComponentSelectionChange(updated);
	};

	/** Handle component name change */
	const handleNameChange = (index: number, newName: string) => {
		const updated = selectedComponents.map((comp) => (comp.index === index ? { ...comp, name: newName } : comp));
		onComponentSelectionChange(updated);
	};

	/** Commit name edit on blur or Enter key */
	const handleNameEditComplete = () => {
		setEditingIndex(null);
	};

	const hasSelectedComponents = selectedComponents.some((comp) => comp.selected);

	const notPushedIndexSet = useMemo(() => new Set(notPushedComponentIndices ?? []), [notPushedComponentIndices]);

	/** Get display text for component type */
	const getTypeDisplayText = (type: string) => {
		if (extensionName === "Devant") {
			return getIntegrationScopeText(getIntegrationComponentTypeText(type, ""));
		}
		return COMPONENT_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type;
	};

	return (
		<div className="mb-6">
			<div className="mb-3 flex items-center justify-between">
				<label className="block text-sm font-normal text-vsc-foreground opacity-80">
					Select Components to {extensionName === "Devant" ? "Deploy" : "Create"}
				</label>
				<span className="text-xs text-vsc-descriptionForeground">
					{selectedComponents.filter((c) => c.selected).length} of {allComponents.length} selected
				</span>
			</div>

			<div className="rounded-lg border border-vsc-input-border bg-vsc-editor-background shadow-sm">
				{allComponents.map((component, index) => {
					const selectionItem = selectedComponents.find((c) => c.index === index);
					const isLibrary = selectionItem?.componentType === "library";
					const isSelected = selectionItem?.selected ?? false;
					const currentType = selectionItem?.componentType || 
						(extensionName === "Devant" ? DevantScopes.INTEGRATION_AS_API : ChoreoComponentType.Service);
					const currentName = selectionItem?.name ?? component.initialValues?.name ?? component.directoryName;
					const isEditing = editingIndex === index;
					const nameError = validationErrors[index];
					const hasError = !!nameError;
					const isNotPushedToGit = notPushedIndexSet.has(index);

					// Per-component: check if this component supports multiple types
					const supportedTypes = getSupportedTypesForComponent(component);
					const showTypePicker = supportedTypes.length > 1;

					return (
						<div
							key={`component-${index}-${component.directoryName}`}
							className={classNames(
								"group border-b transition-colors last:border-b-0",
								{
									"border-vsc-input-border": !isNotPushedToGit,
									"bg-vsc-list-hoverBackground/50": isSelected && !isNotPushedToGit,
									"hover:bg-vsc-list-hoverBackground/25": !isSelected && !isNotPushedToGit,
									// Highlight components that are not pushed to Git using the same warning palette as Banner
									"border-vsc-list-warningForeground bg-vsc-inputValidation-warningBackground text-vsc-list-warningForeground":
										isNotPushedToGit,
								},
							)}
							title={isNotPushedToGit ? "This component has not been pushed to Git." : undefined}
						>
							<div className="flex items-start gap-4 p-4">
						{/* Checkbox */}
						<div className="mt-0.5 shrink-0" title={isLibrary ? "Library components are required and cannot be deselected" : undefined}>
							<VSCodeCheckbox
								checked={isSelected}
								disabled={isLibrary || undefined}
								onChange={(e: any) => handleComponentToggle(index, e.target.checked)}
							/>
						</div>								{/* Component Info */}
								<div className="flex min-w-0 flex-1 flex-col gap-0.5">
									{/* Editable Name - Only editable when selected */}
									<div className="flex items-center">
										{isEditing && isSelected ? (
											<div className="flex flex-col gap-1">
												<input
													type="text"
													value={currentName}
													onChange={(e) => handleNameChange(index, e.target.value)}
													onBlur={handleNameEditComplete}
													onKeyDown={(e) => {
														if (e.key === "Enter") handleNameEditComplete();
														if (e.key === "Escape") {
															setEditingIndex(null);
														}
													}}
													className={`rounded border bg-vsc-input-background px-2 py-1 text-sm font-semibold text-vsc-foreground outline-none transition-colors ${
														hasError
															? "border-vsc-errorForeground focus:border-vsc-errorForeground"
															: "border-vsc-input-border focus:border-vsc-focusBorder"
													}`}
													autoFocus
													spellCheck={false}
												/>
												{hasError && (
													<span className="text-xs text-vsc-errorForeground">
														{nameError}
													</span>
												)}
											</div>
										) : isSelected ? (
											<button
												type="button"
												onClick={() => setEditingIndex(index)}
												className="group/name flex items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-vsc-button-secondaryBackground"
												title={hasError ? nameError : "Click to edit name"}
											>
												<span className="text-sm font-semibold text-vsc-foreground">
													{currentName}
												</span>
												{/* Warning icon always visible if error */}
												{hasError && (
													<Codicon
														name="warning"
														className="text-xs text-vsc-errorForeground"
													/>
												)}
												{/* Edit icon on hover */}
												<Codicon
													name="edit"
													className="text-xs text-vsc-descriptionForeground opacity-0 transition-opacity group-hover/name:opacity-100"
												/>
											</button>
										) : (
											<span className="px-1 py-0.5 text-sm font-semibold text-vsc-descriptionForeground">
												{currentName}
											</span>
										)}
									</div>

							{/* Source Directory */}
							<div className="flex items-center gap-1.5 px-1 opacity-80">
								<Codicon
									name="folder"
									className="text-xs text-vsc-descriptionForeground"
								/>
								<span
									className="font-mono text-xs text-vsc-descriptionForeground"
									title={component.directoryFsPath}
								>
									{component.directoryFsPath}
								</span>
							</div>
								</div>

								{/* Type Selector or Badge - Per-component conditional rendering */}
								<div className="flex shrink-0 items-center gap-2">
									{showTypePicker ? (
										<>
											<span className="sr-only">Component type</span>
											<VSCodeDropdown
												value={currentType}
												onChange={(e: any) => handleComponentTypeChange(index, e.target.value)}
												disabled={!isSelected || undefined}
												className="min-w-[160px]"
												aria-label="Component type"
												title="Multiple integration types were detected for this component. Select the type you want to deploy."
											>
												{supportedTypes.map((opt) => {
													const optSubType = component.initialValues?.subType;
													const optIconConfig = getIntegrationTypeIcon(opt.value, optSubType);
													return (
														<VSCodeOption 
															key={opt.value} 
															value={opt.value}
														>
															<div
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "10px",
																	padding: "6px 4px",
																	minHeight: "32px",
																}}
															>
																<span style={{ width: 16, display: "inline-flex", justifyContent: "center" }}>
																	{optIconConfig.isCodicon ? (
																		<Codicon name={optIconConfig.name} />
																	) : (
																		<Icon
																			name={optIconConfig.name}
																			iconSx={{ fontSize: 14 }}
																			sx={{ height: 14, width: 14 }}
																		/>
																	)}
																</span>
																<span style={{ lineHeight: "18px" }}>
																	{extensionName === "Devant"
																		? getIntegrationComponentTypeText(opt.value, "")
																		: opt.label}
																</span>
															</div>
														</VSCodeOption>
													);
												})}
											</VSCodeDropdown>
										</>
									) : (
										// Single type - show as a badge/chip with type-specific icon and color
										(() => {
											const subType = component.initialValues?.subType;
											const iconConfig = extensionName === "Devant" 
												? getIntegrationTypeIcon(currentType, subType) 
												: { name: "symbol-class", isCodicon: true };
											const typeColor = extensionName === "Devant" 
												? getIntegrationTypeColor(currentType, subType) 
												: undefined;
											const chipStyle = getTypeChipStyle(typeColor);

											return (
												<div
													className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
														!typeColor && (isSelected
															? "border-vsc-button-border bg-vsc-button-secondaryBackground text-vsc-button-secondaryForeground"
															: "border-vsc-input-border bg-vsc-input-background text-vsc-descriptionForeground")
													}`}
													style={chipStyle}
													title="Component type (auto-detected)"
												>
													{iconConfig.isCodicon ? (
														<Codicon 
															name={iconConfig.name} 
															className="text-[10px]" 
														/>
													) : (
														<Icon 
															name={iconConfig.name} 
															iconSx={{ fontSize: 12, opacity: 0.9 }}
															sx={{ height: 12, width: 12 }}
														/>
													)}
													<span>{getTypeDisplayText(currentType)}</span>
												</div>
											);
										})()
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{!hasSelectedComponents && (
				<Banner type="warning" className="mt-3" title="Please select at least one component to proceed." />
			)}

			{/* Show validation error summary if any selected components have invalid names */}
			{selectedComponentsWithErrors.length > 0 && (
				<Banner
					type="error"
					className="mt-3"
					title={`${selectedComponentsWithErrors.length} selected component(s) have invalid names. Please fix the errors above.`}
				/>
			)}
		</div>
	);
};
