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

import { isEqual, xor, keys } from 'lodash';

interface FormatRegexps {
    'date-time': RegExp;
    date: RegExp;
    time: RegExp;
    email: RegExp;
    'ip-address': RegExp;
    ipv6: RegExp;
    uri: RegExp;
    color: RegExp;
    hostname: RegExp;
    'host-name': RegExp;
    alpha: RegExp;
    alphanumeric: RegExp;
    'utc-millisec': (input: any) => boolean;
    regex: (input: any) => boolean;
    style: RegExp;
    phone: RegExp;
    regexp?: boolean;
    pattern?: boolean;
    ipv4?: RegExp;
  }
  
  const FORMAT_REGEXPS: FormatRegexps = {
    'date-time': /^\d{4}-(?:0[0-9]{1}|1[0-2]{1})-(3[01]|0[1-9]|[12][0-9])[tT ](2[0-4]|[01][0-9]):([0-5][0-9]):(60|[0-5][0-9])(\.\d+)?([zZ]|[+-]([0-5][0-9]):(60|[0-5][0-9]))$/,
    date: /^\d{4}-(?:0[0-9]{1}|1[0-2]{1})-(3[01]|0[1-9]|[12][0-9])$/,
    time: /^(2[0-4]|[01][0-9]):([0-5][0-9]):(60|[0-5][0-9])$/,
  
    email: /^(?:[\w!#$%&'*+-/=?^`{|}~]+\.)*[\w!#$%&'*+-/=?^`{|}~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/,
    'ip-address': /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    ipv6: /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,
    uri: /^[a-zA-Z][a-zA-Z0-9+-.]*:[^\s]*$/,
  
    color: /^(#?([0-9A-Fa-f]{3}){1,2}\b|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow|(rgb\(\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*\))|(rgb\(\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*\)))$/,
  
    hostname: /^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/,
    'host-name': /^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/,
  
    alpha: /^[a-zA-Z]+$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    'utc-millisec': (input: any): boolean =>
      typeof input === 'string' && parseFloat(input) === parseInt(input, 10),
    regex: (input: any): boolean => {
        let result = true;
        try {
            new RegExp(input);
        } catch (e) {
            result = false;
        }
        return result;
    },
    style: /\s*(.+?):\s*([^;]+);?/g,
    phone: /^\+(?:[0-9] ?){6,14}[0-9]$/,
  };
  FORMAT_REGEXPS.ipv4 = FORMAT_REGEXPS['ip-address'];
  
  const isFormat = function isFormat(input: any, format: string): boolean {
    if (typeof input === 'string' && FORMAT_REGEXPS[format] !== undefined) {
      if (FORMAT_REGEXPS[format] instanceof RegExp) {
        return FORMAT_REGEXPS[format].test(input);
      }
      if (typeof FORMAT_REGEXPS[format] === 'function') {
        return FORMAT_REGEXPS[format](input);
      }
    }
    return true;
  };

export const helpers = {
  stringFormats: keys(FORMAT_REGEXPS),

  isFormat,

  typeNames: [
    'integer',
    'number', // make sure number is after integer (for proper type detection)
    'string',
    'array',
    'object',
    'boolean',
    'null',
    'date',
  ],

  getType(val: any): string {
    return this.typeNames.find((type) => types[type](val)) || 'any';
  },

  /**
   * Tries to find the least common schema from two supplied JSON schemas. If it is unable to find
   * such a schema, it returns null. Incompatibility in structure/types leads to returning null,
   * except when the difference is only integer/number. Than the 'number' is used instead 'int'.
   * Types/Structure incompatibility in array items only leads to schema that doesn't specify
   * items structure/type.
   * @param schema1 - JSON schema
   * @param schema2 - JSON schema
   * @returns {object|null}
   */
  mergeSchemaObjs(schema1: any, schema2: any): any | null {
    const schema1Keys = keys(schema1);
    const schema2Keys = keys(schema2);
    if (!isEqual(schema1Keys, schema2Keys)) {
      if (schema1.type === 'array' && schema2.type === 'array') {
        // TODO optimize???
        if (isEqual(xor(schema1Keys, schema2Keys), ['items'])) {
          const schemaWithoutItems = schema1Keys.length > schema2Keys.length ? schema2 : schema1;
          const schemaWithItems = schema1Keys.length > schema2Keys.length ? schema1 : schema2;
          const isSame = keys(schemaWithoutItems).reduce((acc, current) =>
            isEqual(schemaWithoutItems[current], schemaWithItems[current]) && acc, true);
          if (isSame) {
            return schemaWithoutItems;
          }
        }
      }
      if (schema1.type !== 'object' || schema2.type !== 'object') {
        return null;
      }
    }

    const retObj: any = {};
    for (let i = 0, { length } = schema1Keys; i < length; i++) {
      const key = schema1Keys[i];
      if (this.getType(schema1[key]) === 'object') {
        const x = this.mergeSchemaObjs(schema1[key], schema2[key]);
        if (!x) {
          if (schema1.type === 'object' || schema2.type === 'object') {
            return { type: 'object' };
          }
          // special treatment for array items. If not mergeable, we can do without them
          if (key !== 'items' || schema1.type !== 'array' || schema2.type !== 'array') {
            return null;
          }
        } else {
          retObj[key] = x;
        }
      } else {
        // simple value schema properties (not defined by object)
        if (key === 'type') { // eslint-disable-line no-lonely-if
          if (schema1[key] !== schema2[key]) {
            if ((schema1[key] === 'integer' && schema2[key] === 'number')
              || (schema1[key] === 'number' && schema2[key] === 'integer')) {
              retObj[key] = 'number';
            } else {
              return null;
            }
          } else {
            retObj[key] = schema1[key];
          }
        } else {
          if (!isEqual(schema1[key], schema2[key])) {
            // TODO Is it even possible to take this path?
            return null;
          }
          retObj[key] = schema1[key];
        }
      }
    }
    return retObj;
  },
};

interface Types {
    string: (instance: any) => boolean;
    number: (instance: any) => boolean;
    integer: (instance: any) => boolean;
    boolean: (instance: any) => boolean;
    array: (instance: any) => boolean;
    null: (instance: any) => boolean;
    date: (instance: any) => boolean;
    any: (instance: any) => boolean;
    object: (instance: any) => boolean;
  }
  
  const types: Types = {
    string: function testString(instance: any): boolean {
      return typeof instance === 'string';
    },
  
    number: function testNumber(instance: any): boolean {
      return typeof instance === 'number' && isFinite(instance);
    },
  
    integer: function testInteger(instance: any): boolean {
      return typeof instance === 'number' && instance % 1 === 0;
    },
  
    boolean: function testBoolean(instance: any): boolean {
      return typeof instance === 'boolean';
    },
  
    array: function testArray(instance: any): boolean {
      return instance instanceof Array;
    },
  
    null: function testNull(instance: any): boolean {
      return instance === null;
    },
  
    date: function testDate(instance: any): boolean {
      return instance instanceof Date;
    },
  
    any: function testAny(instance: any): boolean {
      return true;
    },
  
    object: function testObject(instance: any): boolean {
      return instance && typeof instance === 'object' && !(instance instanceof Array) && !(instance instanceof Date);
    },
  };
  
