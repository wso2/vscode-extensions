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
    return {
        oPrimDirect: input.iPrimDirect,
        oPrimDirectErr: input.iPrimDirectErr,
        oManyOne: input.iManyOne1 + input.iManyOne2 + input.iManyOne3,
        oManyOneErr: input.iManyOne2 + input.iManyOneErr + input.iManyOne3,
        oObjDirect: input.iObjDirect,
        oObjDirectErr: input.iObjDirect,
        oObjProp: {
            p1: input.iObjDirect.d1 + "HI",
            p2: input.iObjProp.op2
        },
        oExp: dmUtils.toUppercase(input.iExp),
        oCustomFn: mapObjectToObject(input.iCustomFn)
    }
}

function mapObjectToObject(iCustomFn: Root["iCustomFn"]): OutputRoot["oCustomFn"] {
    return {};
}
