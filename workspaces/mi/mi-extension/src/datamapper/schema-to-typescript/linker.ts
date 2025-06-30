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

import {JSONSchema, Parent, LinkedJSONSchema} from './types/JSONSchema';
import {isPlainObject} from 'lodash';
import {JSONSchema4Type} from 'json-schema';

/**
 * Traverses over the schema, giving each node a reference to its
 * parent node. We need this for downstream operations.
 */
export function link(schema: JSONSchema4Type | JSONSchema, parent: JSONSchema4Type | null = null): LinkedJSONSchema {
  if (!Array.isArray(schema) && !isPlainObject(schema)) {
    return schema as LinkedJSONSchema
  }

  // Handle cycles
  if ((schema as JSONSchema).hasOwnProperty(Parent)) {
    return schema as LinkedJSONSchema
  }

  // Add a reference to this schema's parent
  Object.defineProperty(schema, Parent, {
    enumerable: false,
    value: parent,
    writable: false,
  })

  // Arrays
  if (Array.isArray(schema)) {
    schema.forEach(child => link(child, schema))
  }

  // Objects
  for (const key in schema as JSONSchema) {
    link((schema as JSONSchema)[key], schema)
  }

  return schema as LinkedJSONSchema
}
