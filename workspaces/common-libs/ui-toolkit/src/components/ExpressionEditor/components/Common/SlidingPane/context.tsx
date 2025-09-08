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

import { createContext, useContext } from "react";
import { VisitedPagesElement } from ".";

interface SlidingPaneContextType {
  prevPage: VisitedPagesElement;
  height:string;
  width:number;
  setPrevPage:(prevPage:VisitedPagesElement) => void;
  setHeight:(height:string) => void;
  setWidth:(width:number) => void;
  moveToNext: (nextPage:VisitedPagesElement) => void;
  moveToPrev: () => void;
  visitedPages: VisitedPagesElement[];
  setVisitedPages: (visitedPages:VisitedPagesElement[]) => void;
  clearAnimations: boolean;
  setClearAnimations: (clearAnimations:boolean) => void;
  getParams: ()=>any;
  isInitialRender: React.MutableRefObject<boolean>;
}
export const SlidingPaneContext = createContext<SlidingPaneContextType | undefined>(undefined);

export const useSlidingPane = () => {
    const context = useContext(SlidingPaneContext);
    if (!context) {
        throw new Error('useSlidingPane must be used within a SlidingPaneProvider');
    }
    return context;
};
