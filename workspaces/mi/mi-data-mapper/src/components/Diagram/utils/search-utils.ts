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
import { DMType, TypeKind } from "@wso2/mi-core";
import { useDMSearchStore } from "../../../store/store";
import { ArrayElement, DMTypeWithValue } from "../Mappings/DMTypeWithValue";
import { MappingMetadata } from "../Mappings/MappingMetadata";
import { Node } from "ts-morph";

export const getSearchFilteredInput = (dmType: DMType, varName?: string) => {
	const searchValue = useDMSearchStore.getState().inputSearch;
	if (!searchValue) {
		return dmType;
	}

	if (varName?.toLowerCase()?.includes(searchValue.toLowerCase())) {
		return dmType
	} else if (dmType.kind === TypeKind.Interface || dmType.kind === TypeKind.Array) {
		const filteredType = getFilteredSubFields(dmType, searchValue);
		if (filteredType) {
			return filteredType
		}
	}
}

export const getSearchFilteredOutput = (dmType: DMType) => {
	const searchValue = useDMSearchStore.getState().outputSearch;
	if (!dmType) {
		return null
	}
	if (!searchValue) {
		return dmType;
	}

	let searchType: DMType = dmType;

	if (searchType.kind === TypeKind.Array) {
		const subFields = searchType.memberType?.fields
			?.map(item => getFilteredSubFields(item, searchValue))
			.filter(item => item);

		return {
			...searchType,
			memberType: {
				...searchType.memberType,
				fields: subFields || []
			}
		}
	} else if (searchType.kind === TypeKind.Interface) {
		const subFields = searchType.fields
			?.map(item => getFilteredSubFields(item, searchValue))
			.filter(item => item);

		return {
			...searchType,
			fields: subFields || []
		}
	}
	return  null;
}

export const getFilteredSubFields = (dmType: DMType, searchValue: string) => {
	if (!dmType) {
		return null;
	}

	if (!searchValue) {
		return dmType;
	}

	if (dmType.kind === TypeKind.Interface) {
		const matchedSubFields: DMType[] = dmType?.fields
            ?.map(fieldItem => getFilteredSubFields(fieldItem, searchValue))
            .filter(fieldItem => fieldItem);

		const matchingName = dmType?.fieldName?.toLowerCase().includes(searchValue.toLowerCase());
		if (matchingName || matchedSubFields?.length > 0) {
			return {
				...dmType,
				fields: matchingName ? dmType?.fields : matchedSubFields
			}
		}
	} else if (dmType.kind === TypeKind.Array) {
		const matchedSubFields: DMType[] = dmType?.memberType
            ?.fields?.map(fieldItem => getFilteredSubFields(fieldItem, searchValue))
            .filter(fieldItem => fieldItem);

		const matchingName = dmType?.fieldName?.toLowerCase().includes(searchValue.toLowerCase());
		if (matchingName || matchedSubFields?.length > 0) {
			return {
				...dmType,
				memberType: {
					...dmType?.memberType,
					fields: matchingName ? dmType?.memberType?.fields : matchedSubFields
				}
			}
		}
	} else {
		return dmType?.fieldName?.toLowerCase()?.includes(searchValue.toLowerCase()) ? dmType : null
	}

	return null;
}

export function hasNoOutputMatchFound(dmType: DMType, valueEnrichedType: DMTypeWithValue): boolean {
	const searchValue = useDMSearchStore.getState().outputSearch;
	const filteredTypeDef = valueEnrichedType.type;
	if (!searchValue) {
		return false;
	} else if (dmType.kind === TypeKind.Interface && filteredTypeDef.kind === TypeKind.Interface) {
		return valueEnrichedType?.childrenTypes.length === 0;
	} else if (dmType.kind === TypeKind.Array && filteredTypeDef.kind === TypeKind.Array) {
		return hasNoMatchFoundInArray(valueEnrichedType?.elements, searchValue);
	}
	return false;
}

function hasNoMatchFoundInArray(elements: ArrayElement[], searchValue: string): boolean {
	if (!elements) {
		return false;
	} else if (elements.length === 0) {
		return true;
	}
	return elements.every(element => {
		if (element.member.type.kind === TypeKind.Interface) {
			return element.member?.childrenTypes.length === 0;
		} else if (element.member.type.kind === TypeKind.Array) {
			return element.member.elements && element.member.elements.length === 0
		} else if (element.member.value) {
			const value = element.member.value?.getText() || element.member.value.getText();
			return !value.toLowerCase().includes(searchValue.toLowerCase());
		}
	});
}

export function getFilteredMappings(mappings: MappingMetadata[], searchValue: string) {
	return mappings.filter(mapping => {
		if (mapping) {
			const lastField = mapping.fields[mapping.fields.length - 1];
			const fieldName = Node.isPropertyAssignment(lastField)
				? lastField.getName()
				: lastField.getText();
			return searchValue === "" || fieldName.toLowerCase().includes(searchValue.toLowerCase());
		}
	});
}
