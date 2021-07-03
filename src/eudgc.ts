/*
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor
 * license agreements; and to You under the Apache License, Version 2.0. "
 */

/* 
 * parse the contents of a cbor/cwt/zlib/base45 dgc
 *
 * Specs can be found at:
 * https://github.com/ehn-dcc-development/hcert-spec/blob/main/hcert_spec.md
 */

import * as cbor from 'cbor-web'
import base45 from 'base45'
import zlib from 'zlib'


const ClaimKeyHcert = -260
const ClaimKeyEuDgcV1 = 1

/*
 * eudgc record
 *
 * contains an array of vaccinations
 * and user information
 * 
 * however if this is to be transported inside a qrcode, most
 * likely there will be only one vaccination
 */
export interface EuDgcCert {
    "v": EuDgcVaccincation[];    // an array of vaccinations, probably just 1 right now
    "dob": string;               // date of birth "1970-01-31",
    "nam": {
        "fn": string;            // familiy name
        "gn": string;            // firstname
        "fnt": string;           // fn in caps and without Umlauts 
        "gnt": string;           // gn in caps and without Umlauts
    };
    "ver": string;  // "1.0.0" ?
}

/*
 * eudgc vaccination record
 *
 * full immunization is given when { dn == sd }
 */
export interface EuDgcVaccincation {
    "ci": string;  // "URN:UVCI:01DE/....."  Unique Certificate Identifier: UVCI
    "co": string;  // "DE", vaccination number
    "dn": number;  // 1, 2 ... number of dose
    "dt": string;  // "2021-02-28", date of vaccination
    "is": string;  // eg "Robert Koch-Institut", issuer
    "ma": string;  // Marketing Authorization Holder - if no MAH present, then manufacturer
    "mp": string;  // Vaccine medicinal product
    "sd": number;  // Total Series of Doses
    "tg": string;  // Disease or agent targeted
    "vp": string;  // Vaccine or prophylaxis
}


export class EuDgc {
       
    /**
     * Parses the data of a digital vaccination qrcode and returns a promise 
     * 
     * @param encodedData the data inside the qr-code.
     * @returns a javascrip structure with the contents 
     */
    static async parse(encodedData: string): Promise<EuDgcCert> {
        return new Promise((resolve, reject) => {
            if (encodedData.indexOf("HC1:") == 0) {
                encodedData = encodedData.substring(4);
            }
            const decodedData = base45.decode(encodedData);
            zlib.inflate(decodedData, function (error: any, buf: any) {
                //console.log(buf.toString("hex"));
                const cborWeb = cbor
                try {
                    cborWeb.decodeFirst(buf, function (error: any, obj: any) {
                        if (error) {
                            reject(error)
                            return
                        }
                        const t = obj
                        const cwt = t.toJSON().value[2]
                        cbor.decodeFirst(cwt, function (error: any, obj: any) {
                            if (error) {
                                reject(error)
                                return
                            }
                            const t2 = obj
                            const hcertRaw = t2.get(ClaimKeyHcert)
                            const eudgc = hcertRaw.get(ClaimKeyEuDgcV1)
                            console.log(JSON.stringify(eudgc, null, 4))
                            resolve(eudgc)
                        });
                    });
                } catch (error) {
                    reject(error)
                }
            });  
        })
    }
}


export const EuDgc_parse = EuDgc.parse;
// define a "global" method in the browsers window object iff running
// in a browser environment
if (typeof window !== "undefined") {
    (window as any).EuDgc_parse = EuDgc.parse
}

console.log("exported: " + EuDgc.parse)
