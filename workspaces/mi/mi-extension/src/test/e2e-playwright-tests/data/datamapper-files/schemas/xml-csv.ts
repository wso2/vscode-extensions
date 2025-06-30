import * as dmUtils from "./dm-utils";

/*
* title : "root",
* inputType : "XML",
*/
interface Root {
id: number
name: string
tags: string[]
addresses: {
city: string
postalCode: number
}[]
}

/*
* title : "root",
* outputType : "CSV",
*/
interface OutputRoot {
Name: string
Age: string
Occupation: string
}



/**
 * functionName : map_S_root_S_root
 * inputVariable : inputroot
*/
export function mapFunction(input: Root): OutputRoot[] {
	return []
}

