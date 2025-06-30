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

import { JSONSchema3or4 } from "to-json-schema";
import { getStateMachine } from "../stateMachine";
import { IOType } from "@wso2/mi-core";

export function convertToJSONSchema(fileContent: JSONSchema3or4): JSONSchema3or4 {
    let schema = JSON.parse(fileContent);
    return schema;
}

export async function generateSchema(ioType: IOType, schemaType: string, filePath: string, projectUri: string): Promise<JSONSchema3or4> {
  const langClient = getStateMachine(projectUri).context().langClient!;
  const response = await langClient.generateSchema({
    filePath: filePath,
    delimiter: "",
    type: schemaType.toUpperCase(),
    title: ""
  });
  let schema = JSON.parse(response.schema);
  let schemaIOMetadataKey = `${ioType}Type`;
  let schemaIOMetadataValue = getSchemaIOMetadataValue(schemaType);
  schema[schemaIOMetadataKey] = schemaIOMetadataValue.toUpperCase();
  return schema;
}

export async function generateSchemaFromContent(projectUri: string, ioType: IOType, content: string, fileType: string, csvDelimiter?: string): Promise<JSONSchema3or4> {
  const langClient =  getStateMachine(projectUri).context().langClient!;
  const response = await langClient.generateSchemaFromContent({
    fileContent: content,
    delimiter: csvDelimiter ?? "",
    type: fileType.toUpperCase(),
    title: ""
  });
  let schema = JSON.parse(response.schema);
  let schemaIOMetadataKey = `${ioType}Type`;
  let schemaIOMetadataValue = getSchemaIOMetadataValue(fileType);
  schema[schemaIOMetadataKey] = schemaIOMetadataValue.toUpperCase();
  return schema;
}

function getSchemaIOMetadataValue(schemaType) {
  switch (schemaType.toUpperCase()) {
      case 'JSONSCHEMA':
          return 'JSON';
      case 'XSD':
          return 'XML';
      default:
          return schemaType;
  }
}