/*
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor
 * license agreements; and to You under the Apache License, Version 2.0. "
 */
/* Written by Scopevisio AG 2021 */

/* parse the contents of a cbor/cwt/zlib/base45 dgc 
 * this file contains everything needed internally for validation
 */

import * as cbor from 'cbor-web'
import base45 from 'base45'
import zlib from 'zlib'
import { Buffer} from 'buffer'



export class Cose1 {

    protected_: Buffer
    unprotected: Map<any, any>
    payload: Buffer
    signatures: Buffer

    static async decodeCborAsync(data: Buffer): Promise<null|any> {
        return new Promise((resolve, reject) => {
            cbor.decodeFirst(data, function (error: any, obj: any) {
                if (error) {
                    reject("failed cbor: " + error)
                    return null
                }
                resolve(obj)
            })
        })
    }

    static async valueOf(encodedData: string): Promise<Cose1 | null> {
        return new Promise((resolve, reject) => {
            if (encodedData.indexOf("HC1:") == 0) {
                encodedData = encodedData.substring(4)
            }

            const decodedData = base45.decode(encodedData)
            zlib.inflate(decodedData, function (error: any, buf: any) {
                if (error) {
                    reject("failed cose1: " + error)
                    return
                }
                cbor.decodeFirst(buf, function (error: any, obj: any) {
                    if (error) {
                        reject("failed cose1: " + error)
                        return
                    }
                    const t = obj
                    const protected_ = t.value[0]
                    const unprotected = t.value[1]
                    const payload = t.value[2]
                    const signatures = t.value[3]
                    const cose1 = new Cose1(protected_, unprotected, payload, signatures)
                    resolve(cose1)
                })
            })
        })
    }

    constructor(protected_: Buffer, unprotected: Map<any, any>, payload: Buffer, signatures: Buffer) {
        this.protected_ = protected_
        this.unprotected = unprotected
        this.payload = payload
        this.signatures = signatures
    }


    makeDataForVerification() {
        // this approach should work but doesn't
        /*
        const raw = cbor.encode(
            [
                "Signature1", 
                cose1.protected_, 
                //Uint8Array.from([]), 
                64,
                64,
                cose1.payload,
            ]
        ) as Uint8Array
        */

        // since the above doesn't work, we do the cbor semi-manually
        // we make 2 chunks, insert a 64 (empty tag) and then assign 0x84
        // to mark the structure as a 4 entry cbor
        const raw1 = cbor.encode(
            [
                "Signature1", 
                this.protected_, 
            ]
        ) as Uint8Array
        const raw2 = cbor.encode(
            [
                this.payload,
            ]
        ) as Uint8Array
        const raw = new Uint8Array(raw1.length + raw2.length)
        for (let i = 0, n = raw1.length; i < n; i++) raw[i] = raw1[i]
        for (let i = 0, n = raw2.length; i < n; i++) raw[raw1.length + i] = raw2[i]
        raw[raw1.length] = 64 // empty slot
        raw[0] = 0x84 // array of length 4
        return raw
    }

    // small asn1 utility
    encodedUnsignedInteger(i: Uint8Array)  {
        let pad = 0
        let offset = 0;
        while (offset < i.length && i[offset] == 0) {
            offset++
        }
        if (offset == i.length) {
            return new Uint8Array([ 0x02, 0x01, 0x00 ])
        }
        if ((i[offset] & 0x80) != 0) {
            pad++
        }
        const length = i.length - offset
        const der = new Uint8Array(2 + length + pad)
        der[0] = 0x02
        der[1] = length + pad
        for (let ptr = 0; ptr < length; ++ptr) {
            der[2 + pad + ptr] = i[offset + ptr]
        }
        return der
    }

    // small asn1 utility (Again)
    computeLength(x: number)  {
        if (x <= 127) {
            return new Uint8Array([ x ])
        } else if (x < 256) {
            return new Uint8Array([0x81, x])
        }
        throw "too long"
    }

    // arraycopy
    static set(src: Uint8Array, srcpos: number, dest: Uint8Array, destpos: number, n: number) {
        for (let i = 0; i < n; i++) {
            dest[destpos + i] = src[srcpos + i]
        }
    }

    // encode the cose1 signature into asn1 r/s type of format (in asn1)
    encodeSignature(raw: Uint8Array) {
        const r = new Uint8Array(raw.length / 2)
        const s = new Uint8Array(raw.length / 2)
        Cose1.set(raw, 0, r, 0, r.length)
        Cose1.set(raw, s.length, s, 0, s.length)
        const re = this.encodedUnsignedInteger(r)
        const se = this.encodedUnsignedInteger(s)
        const len = this.computeLength(re.length + se.length)
        const sig = new Uint8Array(1 + len.length + re.length + se.length)
        sig[0] = 0x30
        Cose1.set(len, 0, sig, 1, len.length)
        Cose1.set(re, 0, sig, 1 + len.length, re.length)
        Cose1.set(se, 0, sig, 1 + len.length + re.length, se.length)
        return sig
    }
    
    

}

console.log("cose1.ts")
