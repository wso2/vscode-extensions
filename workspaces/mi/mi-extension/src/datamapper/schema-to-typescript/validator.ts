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

import {JSONSchema, LinkedJSONSchema} from './types/JSONSchema'
import {traverse} from './utils'

type Rule = (schema: JSONSchema) => boolean | void
const rules = new Map<string, Rule>()

rules.set('Enum members and tsEnumNames must be of the same length', schema => {
  if (schema.enum && schema.tsEnumNames && schema.enum.length !== schema.tsEnumNames.length) {
    return false
  }
})

rules.set('tsEnumNames must be an array of strings', schema => {
  if (schema.tsEnumNames && schema.tsEnumNames.some(_ => typeof _ !== 'string')) {
    return false
  }
})

rules.set('When both maxItems and minItems are present, maxItems >= minItems', schema => {
  const {maxItems, minItems} = schema
  if (typeof maxItems === 'number' && typeof minItems === 'number') {
    return maxItems >= minItems
  }
})

rules.set('When maxItems exists, maxItems >= 0', schema => {
  const {maxItems} = schema
  if (typeof maxItems === 'number') {
    return maxItems >= 0
  }
})

rules.set('When minItems exists, minItems >= 0', schema => {
  const {minItems} = schema
  if (typeof minItems === 'number') {
    return minItems >= 0
  }
})

rules.set('deprecated must be a boolean', schema => {
  const typeOfDeprecated = typeof schema.deprecated
  return typeOfDeprecated === 'boolean' || typeOfDeprecated === 'undefined'
})

export function validate(schema: LinkedJSONSchema, filename: string): string[] {
  const errors: string[] = []
  rules.forEach((rule, ruleName) => {
    traverse(schema, (schema, key) => {
      if (rule(schema) === false) {
        errors.push(`Error at key "${key}" in file "${filename}": ${ruleName}`)
      }
      return schema
    })
  })
  return errors
}
