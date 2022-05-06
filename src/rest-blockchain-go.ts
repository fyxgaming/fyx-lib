import axios from 'axios';
import { Address, Script } from 'bsv';
import { createHash } from 'crypto';
import { IUTXO } from './interfaces';

export class PaymentIO {
    script: Buffer;
    amount: number;
    splitSats?: number;
    maxSplits?: number;

    static serialize(io: PaymentIO): {[key: string]: any} {
        return {
            s: io.script.toString('base64'),
            i: io.amount,
            ss: io.splitSats || 0,
            ms: io.maxSplits || 0
        };
    }
}
export class PaymentRequest {
    rawtx: Buffer;
    io: PaymentIO[];
    feeIo: PaymentIO;

    static serialize(p: PaymentRequest): any {
        return {
            r: p.rawtx.toString('base64'),
            i: p.io.map(PaymentIO.serialize),
            f: PaymentIO.serialize(p.feeIo)
        };
    }
};

export class RestBlockchain {
    constructor(
        public apiUrl: string,
        public network: string
    ) { }

    get bsvNetwork(): string {
        switch (this.network) {
            case 'stn':
                return 'stn';
            case 'main':
                return 'mainnet';
            default:
                return 'testnet';
        }
    }

    async broadcast(rawtx) {
        const { data: txid } = await axios({
            method: 'POST',
            url: `${this.apiUrl}/broadcast`,
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            data: Buffer.from(rawtx, 'hex')
        });
        return txid;
    }

    async fetch(txid: string): Promise<string> {
        const { data } = await axios({
            method: 'GET',
            url: `${this.apiUrl}/tx/${txid}`,
            responseType: 'arraybuffer'
        });
        return data.toString('hex');
    };

    async time(txid: string): Promise<number> {
        return Date.now();
    }

    async spends(txid: string, vout: number): Promise<string | null> {
        const { data } = await axios({
            method: 'GET',
            url: `${this.apiUrl}/spends/${txid}/${vout}`,
            responseType: 'arraybuffer'
        });
        return data.toString('hex');
    }

    async utxos(scriptHex: string): Promise<IUTXO[]> {
        const script = Script.fromHex(scriptHex);
        const scripthash = createHash('sha256').update(script.toBuffer()).digest().reverse();
        const { data: utxos } = await axios(`${this.apiUrl}/utxos/${scripthash.toString('hex')}`);
        return utxos.map(({ t, v: vout, s: satoshis }) => ({
            txid: Buffer.from(t, 'base64').toString('hex'),
            vout,
            satoshis,
            script: scriptHex
        }));
    };

    async utxoCount(scriptHex: string): Promise<number> {
        const script = Script.fromHex(scriptHex);
        const scripthash = createHash('sha256').update(script.toBuffer()).digest().reverse();
        const { data: count } = await axios(`${this.apiUrl}/utxos/${scripthash.toString('hex')}/count`);
        return count;
    }

    async balance(scriptHex: string): Promise<number> {
        const script = Script.fromHex(scriptHex);
        const scripthash = createHash('sha256').update(script.toBuffer()).digest().reverse();
        const { data: balance } = await axios(`${this.apiUrl}/utxos/${scripthash.toString('hex')}/balance`);
        return balance;
    }

    async applyPayments(): Promise<any> {
        throw new Error('applyPayments Not Implemented');
    };

    async buildPayments(req: PaymentRequest): Promise<Buffer> {
        const { data: outTx } = await axios.post(`${this.apiUrl}/pay`, PaymentRequest.serialize(req));
        return outTx;
    }
}
