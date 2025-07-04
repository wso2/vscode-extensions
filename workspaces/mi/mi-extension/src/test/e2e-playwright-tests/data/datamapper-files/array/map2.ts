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
    oInitObj1D: {
        p1: string
        p2: string[]
    }[]
    oPrimMapFn2D: number[][]
    oSingle: string
}



/**
 * functionName : map_S_root_S_Root
 * inputVariable : inputroot
*/
export function mapFunction(input: Root): OutputRoot {
    return {
        oInitObj1D: [{
            p1: input.iInitPrim
        },
        input.iInitObj
        ],
        oPrimMapFn2D: input.iPrimMapFn2D
            .map((iPrimMapFn2DItem) => {
                return iPrimMapFn2DItem
                    .map((iPrimMapFn2DItemItem) => { return iPrimMapFn2DItemItem })
            }),
        oSingle: input.iSingle1D[1]
    }
}

