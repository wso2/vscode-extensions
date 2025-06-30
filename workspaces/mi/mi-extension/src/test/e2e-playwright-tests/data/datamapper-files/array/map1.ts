import * as dmUtils from "./dm-utils";

/*
* title : "root",
* inputType : "JSON",
*/
interface Root {
    iPrimDirect1D: number[]
    iPrimMapFn1D: number[]
    iObjMapFn1D: {
        p1: string
        p2: string[]
    }[]
    iInitPrim: string
    iInitObj: {
        p1: string
        p2: string[]
    }
    iPrimMapFn2D: number[][]
    iSingle1D: string[]
}

/*
* outputType : "JSON",
*/
interface OutputRoot {
    oPrimDirect1D: number[]
    oPrimMapFn1D: number[]
    oObjMapFn1D: {
        q1: string
        q2: string[]
    }[]
    oInitPrim1D: string[]
    oInitPrim2D: string[][]
}



/**
 * functionName : map_S_root_S_Root
 * inputVariable : inputroot
*/
export function mapFunction(input: Root): OutputRoot {
    return {
        oPrimDirect1D: input.iPrimDirect1D,
        oPrimMapFn1D: input.iPrimMapFn1D
            .map((iPrimMapFn1DItem) => { return iPrimMapFn1DItem }),
        oObjMapFn1D: input.iObjMapFn1D
            .filter(iObjMapFn1DItem => iObjMapFn1DItem !== null)
            .map((iObjMapFn1DItem) => {
                return {
                    q1: iObjMapFn1DItem.p1,
                    q2: iObjMapFn1DItem.p2
                        .map((p2Item) => { return p2Item })
                }
            }),
        oInitPrim1D: [input.iInitPrim],
        oInitPrim2D: [[], [input.iInitPrim]]
    }
}

