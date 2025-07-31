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
  getParams: ()=>any
}
export const SlidingPaneContext = createContext<SlidingPaneContextType | undefined>(undefined);

export const useSlidingPane = () => {
    const context = useContext(SlidingPaneContext);
    if (!context) {
        throw new Error('useSlidingPane must be used within a SlidingPaneProvider');
    }
    return context;
};