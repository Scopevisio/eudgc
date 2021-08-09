/*
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor
 * license agreements; and to You under the Apache License, Version 2.0. "
 */
/* Written by Scopevisio AG 2021 */

/* 
 * parse the contents of a cbor/cwt/zlib/base45 dgc
 *
 * Specs can be found at:
 * https://github.com/ehn-dcc-development/hcert-spec/blob/main/hcert_spec.md
 */

import * as cbor from 'cbor-web'
import base45 from 'base45'
import zlib from 'zlib'
import { CertInfo, Trustlist } from './trustlist'
import { Cose1 } from './cose1'
import { Buffer } from 'buffer'
import crypto from 'crypto-browserify'


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


/*
 * Object that contains the available options to the validate method.
 *
 * You can pass in a filter on what certificates to use
 * or an explicit list of certificates. See below for available options.
 *
 */
export interface ValidationOptions {

    /* certFilter: is an optional filter predicate function. It is passed each 
     * certInfo and should return false for certificates that should be skipped
     * during validation. If the certFilter is undefined or null, then all 
     * certs will be used for validation.
     */
    certFilter?: (certInfo: CertInfo) => boolean;

    /* explicitCerts: an optional array of certificates to use for 
     * validation. this allows to pass in more recent certificates or other
     * certificates. 
     * 
     * Please note that one can obtain wrong and invalid(!)
     * results by doing so. The responsibility to only indicate really
     * valid certificates as valid in your product is up to you. 
     * This is also potentially usefull for debugging.
     */
    explicitCerts?: CertInfo[];
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

    /*
     * ... perform the validation
     *
     * This method will throw an exception if the cert is invalid.
     * this can be the case if 
     * 
     * 1. the cert falsely claims to be signed by one of the signatures in the 
     *    trustlist 
     * 2. or if the cert is not signed correctly at all
     * 3. or if the cert is signed correctly by some unknown signature 
     * 
     * all three cases result in an invalid certificate
     * 
     * the second optional argument controlls several aspects of how the 
     * validation method should work.
     *  
     * Certificates that cannot be handled by the client-side browser crypto are also skipped
     * and a warning message is printed on the console. 
     * 
     */
    static async validate(encodedData: string, options?: ValidationOptions) {
        const cose1 = await Cose1.valueOf(encodedData)
        if (!cose1) {
            return null
        }
        const raw = cose1.makeDataForVerification()
        const signature = Buffer.from(cose1.encodeSignature(cose1.signatures)).toString("hex")
        var certInfos = await Trustlist.instance.getCertInfos()
        if (options?.explicitCerts) {
            certInfos = [...options?.explicitCerts]
        }
        // filter certs
        if (options?.certFilter) {
            const oldCount = certInfos.length
            certInfos = certInfos.filter(options?.certFilter)
            if (certInfos.length != oldCount) {
                console.info("#" + (oldCount - certInfos.length) + " of " + oldCount + " certifcates removed by filter")
            }
        }
        for (let i = 0, n = certInfos.length; i < n; i++) {
            const certInfo = certInfos[i]
            // if we run into an exception on one certinfo, continue with the others
            try {
                const verify = crypto.createVerify("sha256")
                verify.update(raw)
                const verification = verify.verify(certInfo.pubkey, signature, "hex")
                if (verification) {
                    // check for date (validity dates of x509 certificate)
                    const now = new Date().getTime()
                    const timeValid = now >= certInfo.notbefore && now <= certInfo.notafter
                    if (timeValid) {
                        return certInfo
                    }
                }
            } catch (e) {
                console.warn("unable to handle cert " + (i + 1) + " of " + n + ": " + certInfo.subject + ": " + e)
            }
        }
        throw "Not matching certificate found"
    }
}


export const EuDgc_parse = EuDgc.parse;
export const EuDgc_validate = EuDgc.validate;

// define a "global" method in the browsers window object iff running
// in a browser environment
if (typeof window !== "undefined") {
    (window as any).EuDgc_parse = EuDgc.parse;
    (window as any).EuDgc_validate = EuDgc.validate;
}

console.log("eudgc.ts")
