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
	return {}
}

