import axios from 'axios';
import { Certificate } from '@fidm/x509';
import * as fs from "fs";
import * as path from "path";

/*
 * Fetches the certs from https://de.dscg.ubirch.com/trustList/DSC/
 * and creates the certs.json file in scr folder
 */
export class FetchCerts {

  constructor() {
    this.fetchAndUpdate();
  }

  createIssuerOrSubject(data) {
    let str = '';

    for (const attr of data.attributes) {
      if (!str) {
        str += attr.shortName ? `${attr.shortName} = ${attr.value}` : `${attr.name} = ${attr.value}`
      } else {
        str += attr.shortName ? ` ${attr.shortName} = ${attr.value}` : ` ${attr.name} = ${attr.value}`
      }
    }

    return str;
  }

  decodeX509(rawData, kid) {
    let data = {
      issuer: '',
      subject: '',
      notbefore: 0,
      notafter: 0,
      pubkey: '',
      rawX509data: ''
    }

    let CERT_PEM_STR = `-----BEGIN CERTIFICATE-----\n${rawData}\n-----END CERTIFICATE-----`;

    try {
      let cert = Certificate.fromPEM(CERT_PEM_STR);

      data.rawX509data = rawData;
      data.issuer = this.createIssuerOrSubject(cert.issuer);
      data.subject = this.createIssuerOrSubject(cert.subject)
      data.kid = kid
      data.notbefore = new Date(cert.validFrom).getTime();
      data.notafter = new Date(cert.validTo).getTime();
      data.pubkey = cert.publicKey.toPEM();
    } catch (err) {
      console.warn(`[WARN] Failure creating cert data for "${kid}".\n${err}\n`);
    }

    return data;
  }

  async fetchAndUpdate() {

    try {
      const result = await axios.get('https://de.dscg.ubirch.com/trustList/DSC/');
      const rawData = result.data;
      const comps = rawData.split('\n');
      const json = JSON.parse(comps[1]);

      let certs = {
        certs: []
      }

      for (const cert of json.certificates) {
        const data = this.decodeX509(cert.rawData, cert.kid);

        certs.certs.push(data);
      }

      fs.mkdirSync(path.join('./src'), { recursive: true });
      fs.writeFile(path.join('./src/certs.json'), JSON.stringify(certs,null,0), () => {});

    } catch (err) {
      console.error('failed to submit document: ' + err);
    }
  }
}

new FetchCerts();