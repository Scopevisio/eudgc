# eudgc

A pure javascript (or typescript) library for parsing and validating the European Digital Green Certificate (EuDGC) better known as the "Digitaler Impfpass" in germany or "Digital COVID Certificate or even "Covid Vaccination Pass/QRCode" in other places.

```
Licensed to the Apache Software Foundation (ASF) under one or more contributor
license agreements; and to You under the Apache License, Version 2.0. "
```

The certificate is typically provided in form of a QR-Code. This library deals with the contents
of this QR-Code. The QR-Code recognition must be done using some other tools or libraries.



## Example Application

Use this application for reference and as an example. This sample is intended to be a full 
minimalistic example and is found in the index.html in the docs/ folder.

[Simple minimalistic Demo](https://scopevisio.github.io/eudgc/index.html)

## Example Videos

![Simple minimalistic Demo Video](https://scopevisio.github.io/eudgc/cast_eudgc_simple.gif)

[Demo Application (in German)](https://scopevisio.github.io/eudgc/cast_eudgc.gif)

## Explanation and motivation

The EuDGC Certificate is a Base45 encoded, Zlib-compressed, Cbor structure. The Cbor structure itself
confirms to the COSE Standard, which is an extension of Cbor that provides signatures.

The EuDGC Certificate is signed using an X509 signature. Apparently only the signatures are considered valid
that are provided by the following url:

[Trustlist](https://de.dscg.ubirch.com/trustList/DSC/)

The certificate that signed the TLS certificate of this site was issued by D-Trust GmbH. D-Trust is a subsidary of
the Bundesdruckerei Gruppe (German government agency for printing).

Basically a EuDGC-COVID certificate is thus valid when it was digitally signed by one of the certificates in the trustlist. The X509  cerficates can be obtained by saving the contents of the "rawData" property and decoding the base64 to binary.
After that a certicate can be viewed using

```
openssl -inform der -text < your_binary_data.bin
```

The publickeys are part of the X509 certificates of course. Using openssl or other cryptolibraries
you can also convert those certificates into the more common PEM format.

## Installation



### NPM
Available [on npm](https://www.npmjs.com/package/eudgc). Can be used in a Node.js program or with a module bundler such as Webpack or Browserify.

```
npm install eudgc --save
```

```javascript
// ES6 import (preferred)

import { EuDgc, EuDgcCert, EuDgcVaccination} from 'eudgc'
let qrCode = "HC1....";
try {
    let certificate = EuDgc.parse(qrCode);
    // .... 
} catch (error) {
    console.log("not a eudgc qrcode: " + error)
}
```

### Browser

Alternatively you can include the .js bundle in your browser via a good old script tag.

```html
<script src="eudgc.js"></script>
<script>

    let qrCode = "HC1....";
    try {
        let certificate = EuDgc_parse(qrCode);
        // .... 
    } catch (error) {
        console.log("not a eudgc qrcode: " + error)
    }

</script>
```


## Usage

Eudgc defines a method on the window object that takes a single argument. Of course when running outside
of a browser you should just use the ES6 imports. Typescript is recommend, but plain javascript will
work just the same.

```javascript
// Using the global function on window in browser
EuDgc_parse(qrCode);
```

```javascript
// When using typescript and/or ES6 modules
EuDgc.parse(qrCode);
```

### Arguments

The single argument is the qrcode contents in form of a string.

### Return value
If a QR is able to be decoded the library will return an object of the following structure:

```javascript
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
```

Note that a person is fully vaccinated when dn == sd and in most interpretation if the date of 
vaccination is at least 10 days old.

## Contributing

Eudgc is written using [typescript](http://www.typescriptlang.org/).
You can view the development source in the [`src`](./src) directory.

Typescript, webpack and everything else is defined to be a development dependency.
Using the npx command that comes with node.js the typescript and webpack binaries from the 
project can be used. This is the intended way. The scripts inside package.json use npx to
perform the various tasks.


```
// for building a production build use
npm run build
```

```
// for development use
npm run serve
```

- Source hosted at [GitHub](https://github.com/Scopevisio/eudgc)
- Report issues, questions, feature requests via email to stepan.rutz@scopevisio.com

Pull requests and all sorts of improvements are welcome. However this project should just
provide the basic EuDGC parsing and validation. Other functionality belongs in other projects.

## Project sponsor

This project is sponsored by Scopevisio AG / Bonn.

[Scopevisio AG](https://www.scopevisio.com)


/Stepan

<!--  

anigifs created like this:

fmpeg -i docs/cast_eudgc_simple.mkv -vf "fps=20,scale=352:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 docs/cast_eudgc_simple.gif 

-->