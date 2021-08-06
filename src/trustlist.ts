/*
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor
 * license agreements; and to You under the Apache License, Version 2.0. "
 */
/* Written by Scopevisio AG 2021 */

/* The list of certicates that are trustworthy for validation.
 * 
 * The list is accessed via this singleton class and originates
 * from 
 *  https://de.dscg.ubirch.com/trustList/DSC/
 */

import data from './certs.json'


/* Certificate information. This informatino identifies the certificate
 * that has validated the given QR-Code. The certificate is a X509 
 * standard certificate, however this datastructure provides convenient fields.
 */
export interface CertInfo {
    subject: string;       // subject of the certificate
    issuer: string;        // string that describes the issuer of the certificte
    notbefore: number;     // date before which the certificate should be considered invalid
    notafter: number;      // date after which the certificate should be considered invalid
    pubkey: string;        // the publickey of the certificate in a way that the browser-crypto api can process it
    rawX509data: string;   // the X509 certificate in binary DER format, encoded as base64
    // the rawX509 string contains all the other fields, but needs to be decoded to access that information
    // one way to do that is using  openssl -inform DER -text 
}



export class Trustlist {
    static instance = new Trustlist()

    private initialized = false
    private certInfos: CertInfo[] = []

    async getCertInfos() {
        if (!this.initialized) {
            this.initialized = true
            const certs = data.certs as CertInfo[]
            this.certInfos.push(...certs)
        }
        return this.certInfos
    }


}

