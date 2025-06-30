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

import {merge, isEqual} from 'lodash';
import { helpers }from './helpers';

interface Options {
  required?: boolean;
  postProcessFnc?: any;
  strings?: {
    detectFormat?: boolean;
    preProcessFnc?: any;
  };
  arrays?: {
    mode?: string;
  };
  objects?: {
    preProcessFnc?: any;
    postProcessFnc?: any;
    additionalProperties?: boolean;
  };
}

const defaultOptions: Options = {
  required: false,
  postProcessFnc: null,
  strings: {
    detectFormat: true,
    preProcessFnc: null,
  },
  arrays: {
    mode: 'all',
  },
  objects: {
    preProcessFnc: null,
    postProcessFnc: null,
    additionalProperties: true,
  },
};

const skipReverseFind = ['hostname', 'host-name', 'alpha', 'alphanumeric', 'regex', 'regexp', 'pattern'];
const filteredFormats = helpers.stringFormats.filter(item => !skipReverseFind.includes(item));

function getCommonTypeFromArrayOfTypes(arrOfTypes: string[]): string | null {
    let lastVal: string | null = null;
    for (let i = 0, { length } = arrOfTypes; i < length; i++) {
      let currentType: string = arrOfTypes[i];
      if (i > 0) {
        if (currentType === 'integer' && lastVal === 'number') {
          currentType = 'number';
        } else if (currentType === 'number' && lastVal === 'integer') {
          lastVal = 'number';
        }
        if (lastVal !== currentType) return null;
      }
      lastVal = currentType;
    }
    return lastVal;
}
  
function getCommonArrayItemsType(arr: any[]): string | null {
    return getCommonTypeFromArrayOfTypes(arr.map(item => helpers.getType(item)));
}

class ToJsonSchema {
    options: Options;
  
    constructor(options: Options) {
      this.options = merge({}, defaultOptions, options);
  
      this.getObjectSchemaDefault = this.getObjectSchemaDefault.bind(this);
      this.getStringSchema = this.getStringSchema.bind(this);
      this.objectPostProcessDefault = this.objectPostProcessDefault.bind(this);
      this.commmonPostProcessDefault = this.commmonPostProcessDefault.bind(this);
      this.objectPostProcessDefault = this.objectPostProcessDefault.bind(this);
    }
  
    getCommonArrayItemSchema(arr: any[]): object | undefined {
      const schemas = arr.map(item => this.getSchema(item));
      return schemas.reduce((acc, current) => helpers.mergeSchemaObjs(acc, current), schemas.pop());
    }
  
    getObjectSchemaDefault(obj: Record<string, unknown>): Record<string, unknown> {
      const schema: Record<string, unknown> = { type: 'object' };
      const objKeys: string[] = Object.keys(obj);
      if (objKeys.length > 0) {
        schema.properties = objKeys.reduce((acc, propertyName) => {
          acc[propertyName] = this.getSchema(obj[propertyName]);
          return acc;
        }, {});
      }
      return schema;
    }
  
    getObjectSchema(obj: Record<string, any>): Record<string, any> {
        if (this.options && this.options.objects && this.options.objects.preProcessFnc){
            if (this.options.objects.preProcessFnc !== null && this.options.objects.preProcessFnc !== undefined) {
                return this.options.objects.preProcessFnc(obj, this.getObjectSchemaDefault);
            }
        }
        return this.getObjectSchemaDefault(obj);
    }
  
    getArraySchemaMerging(arr: any[]): Record<string, any> {
      const schema: Record<string, any> = { type: 'array' };
      const commonType: string|null = getCommonArrayItemsType(arr);
      if (commonType) {
        schema.items = { type: commonType };
        if (commonType !== 'integer' && commonType !== 'number') {
          const itemSchema = this.getCommonArrayItemSchema(arr);
          if (itemSchema) {
            schema.items = itemSchema;
          }
        } else if (this.options.required) {
          schema.items.required = true;
        }
      }
      return schema;
    }
  
    getArraySchemaNoMerging(arr: any[]): object {
      const schema: Record<string, any> = { type: 'array' };
      if (arr.length > 0) {
        schema.items = this.getSchema(arr[0]);
      }
      return schema;
    }
  
    getArraySchemaTuple(arr: any[]): Record<string, any> {
      const schema: Record<string, any> = { type: 'array' };
      if (arr.length > 0) {
        schema.items = arr.map(item => this.getSchema(item));
      }
      return schema;
    }
  
    getArraySchemaUniform(arr: any[]): object {
      const schema: Record<string, any> = this.getArraySchemaNoMerging(arr);
  
      if (arr.length > 1) {
        for (let i = 1; i < arr.length; i++) {
          if (!isEqual(schema.items, this.getSchema(arr[i]))) {
            throw new Error('Invalid schema, incompatible array items');
          }
        }
      }
      return schema;
    }
  
    getArraySchema(arr: any[]): Record<string, any> {
      if (arr.length === 0) { return { type: 'array' }; }
      if (this.options.arrays && this.options.arrays.mode) {
        switch (this.options.arrays.mode) {
            case 'all': return this.getArraySchemaMerging(arr);
            case 'first': return this.getArraySchemaNoMerging(arr);
            case 'uniform': return this.getArraySchemaUniform(arr);
            case 'tuple': return this.getArraySchemaTuple(arr);
            default: throw new Error(`Unknown array mode option '${this.options.arrays.mode}'`);
          }
      }
      throw new Error(`Unknown array mode option`);
    }

  
    getStringSchema(value: string): object {
      const schema: Record<string, any> = { type: 'string' };
  
      if (this.options.strings && !this.options.strings.detectFormat) {
        return schema;
      }
  
      const index: number = filteredFormats.findIndex(item => helpers.isFormat(value, item));
      if (index >= 0) {
        schema.format = filteredFormats[index];
      }
  
      return schema;
    }
  
    commmonPostProcessDefault(type: string, schema: object, value: any): object {
      if (this.options.required) {
        return merge({}, schema, { required: true });
      }
      return schema;
    }
  
    objectPostProcessDefault(schema: object, obj: object): object {
      if (this.options.objects && this.options.objects.additionalProperties === false && Object.getOwnPropertyNames(obj).length > 0) {
        return merge({}, schema, { additionalProperties: false });
      }
      return schema;
    }
  
    getSchema(value: any): object {
      const type: string = helpers.getType(value);
      if (!type) {
        throw new Error("Type of value couldn't be determined");
      }
  
      let schema: object;
      switch (type) {
        case 'object':
          schema = this.getObjectSchema(value);
          break;
        case 'array':
          schema = this.getArraySchema(value);
          break;
        case 'string':
          schema = this.getStringSchema(value);
          break;
        default:
          schema = { type };
      }
  
      if (this.options.postProcessFnc) {
        schema = this.options.postProcessFnc(type, schema, value, this.commmonPostProcessDefault);
      } else {
        schema = this.commmonPostProcessDefault(type, schema, value);
      }
  
      if (type === 'object') {
        if (this.options.objects &&  this.options.objects.postProcessFnc) {
          schema = this.options.objects.postProcessFnc(schema, value, this.objectPostProcessDefault);
        } else {
          schema = this.objectPostProcessDefault(schema, value);
        }
      }
      return schema;
    }
}

function toJsonSchema(value: any, options?: any): any {
    const tjs = new ToJsonSchema(options);
    return tjs.getSchema(value);
}

export default toJsonSchema;