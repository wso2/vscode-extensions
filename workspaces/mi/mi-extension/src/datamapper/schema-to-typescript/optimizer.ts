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

import {uniqBy} from 'lodash'
import {Options} from '.'
import {generateType} from './generator'
import {AST, T_ANY, T_UNKNOWN} from './types/AST'

export function optimize(ast: AST, options: Options, processed = new Set<AST>()): AST {
  if (processed.has(ast)) {
    return ast
  }

  processed.add(ast)

  switch (ast.type) {
    case 'ARRAY':
      return Object.assign(ast, {
        params: optimize(ast.params, options, processed),
      })
    case 'INTERFACE':
      return Object.assign(ast, {
        params: ast.params.map(_ => Object.assign(_, {ast: optimize(_.ast, options, processed)})),
      })
    case 'INTERSECTION':
    case 'UNION':
      // Start with the leaves...
      const optimizedAST = Object.assign(ast, {
        params: ast.params.map(_ => optimize(_, options, processed)),
      })

      // [A, B, C, Any] -> Any
      if (optimizedAST.params.some(_ => _.type === 'ANY')) {
        return T_ANY
      }

      // [A, B, C, Unknown] -> Unknown
      if (optimizedAST.params.some(_ => _.type === 'UNKNOWN')) {
        return T_UNKNOWN
      }

      // [A (named), A] -> [A (named)]
      if (
        optimizedAST.params.every(_ => {
          const a = generateType(omitStandaloneName(_), options)
          const b = generateType(omitStandaloneName(optimizedAST.params[0]), options)
          return a === b
        }) &&
        optimizedAST.params.some(_ => _.standaloneName !== undefined)
      ) {
        optimizedAST.params = optimizedAST.params.filter(_ => _.standaloneName !== undefined)
      }

      // [A, B, B] -> [A, B]
      const params = uniqBy(optimizedAST.params, _ => generateType(_, options))
      if (params.length !== optimizedAST.params.length) {
        optimizedAST.params = params
      }

      return Object.assign(optimizedAST, {
        params: optimizedAST.params.map(_ => optimize(_, options, processed)),
      })
    default:
      return ast
  }
}

// TODO: More clearly disambiguate standalone names vs. aliased names instead.
function omitStandaloneName<A extends AST>(ast: A): A {
  switch (ast.type) {
    case 'ENUM':
      return ast
    default:
      return {...ast, standaloneName: undefined}
  }
}
