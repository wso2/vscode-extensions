import * as dmUtils from "./dm-utils";

/*
* title : "root",
* inputType : "JSON",
*/
interface Root {
iPrimDirect: string
iPrimDirectErr: string
iManyOne1: string
iManyOne2: string
iManyOne3: string
iManyOneErr: boolean
iObjDirect: {
d1: string
d2: number
}
iObjProp: {
op1: string
op2: string
}
iCustomFn: {
k1: string
k2: number
}
iExp: string
}

/*
* title : "root",
* outputType : "JSON",
*/
interface OutputRoot {
oPrimDirect: string
oPrimDirectErr: number
oManyOne: string
oManyOneErr: number
oObjDirect: {
d1: string
d2: number
}
oObjDirectErr: {
d1: string
d2: string
}
oObjProp: {
p1: string
p2: number
}
oCustomFn: {
k1: string
k3: number
}
oExp: string
}



/**
 * functionName : map_S_root_S_root
 * inputVariable : inputroot
*/
export function mapFunction(input: Root): OutputRoot {
	return {}
}

