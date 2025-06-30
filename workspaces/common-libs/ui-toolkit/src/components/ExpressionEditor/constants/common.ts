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

import { css } from '@emotion/css';

export const ANIMATION = {
    enter: css({
        transition: 'all 0.3s ease-in'
    }),
    enterFrom: css({
        opacity: 0
    }),
    enterTo: css({
        opacity: 1
    }),
    leave: css({
        transition: 'all 0.3s ease-out'
    }),
    leaveFrom: css({
        opacity: 1
    }),
    leaveTo: css({
        opacity: 0
    })
};

export const ANIMATION_SCALE_UP = {
    enter: css({
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out'
    }),
    enterFrom: css({
        transform: 'scaleY(0)',
        opacity: 0,
        transformOrigin: 'bottom'
    }),
    enterTo: css({
        transform: 'scaleY(1)',
        opacity: 1,
        transformOrigin: 'bottom'
    }),
    leave: css({
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out'
    }),
    leaveFrom: css({
        transform: 'scaleY(1)',
        opacity: 1,
        transformOrigin: 'bottom'
    }),
    leaveTo: css({
        transform: 'scaleY(0)',
        opacity: 0,
        transformOrigin: 'bottom'
    })
};

export const ANIMATION_SCALE_DOWN = {
    enter: css({
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out'
    }),
    enterFrom: css({
        transform: 'scaleY(0)',
        opacity: 0,
        transformOrigin: 'top'
    }),
    enterTo: css({
        transform: 'scaleY(1)',
        opacity: 1,
        transformOrigin: 'top'
    }),
    leave: css({
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out'
    }),
    leaveFrom: css({
        transform: 'scaleY(1)',
        opacity: 1,
        transformOrigin: 'top'
    }),
    leaveTo: css({
        transform: 'scaleY(0)',
        opacity: 0,
        transformOrigin: 'top'
    })
};

/* Helper pane related */
/* All these values are in pixels */
export const ARROW_HEIGHT = 16;
export const ARROW_OFFSET = 10;

/* Dropdown related */
export const DROPDOWN_DEFAULT_WIDTH = 350;
export const DROPDOWN_MIN_WIDTH = 335;
