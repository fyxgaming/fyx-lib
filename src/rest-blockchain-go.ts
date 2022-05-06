import axios from 'axios';
import { Address, Script, Tx } from 'bsv';
import { createHash } from 'crypto';
import { IUTXO } from './interfaces';

export class PaymentIO {
    script: Buffer;
    satoshis: number;
    splitSats?: number;
    maxSplits?: number;

    static serialize(io: PaymentIO): {[key: string]: any} {
        return {
            s: io.script.toString('base64'),
            i: io.satoshis,
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

    async loadParents(rawtx: string): Promise<{ script: string, satoshis: number }[]> {
        const tx = Tx.fromHex(rawtx);
        return Promise.all(tx.txIns.map(async txIn => {
            const txid = Buffer.from(txIn.txHashBuf).reverse().toString('hex');
            const rawtx = await this.fetch(txid);
            const t = Tx.fromHex(rawtx);
            const txOut = t.txOuts[txIn.txOutNum]
            return { script: txOut.script.toHex(), satoshis: txOut.valueBn.toNumber() };
        }))
    }

    async applyPayments(rawtx, payments: { from: string, amount: number }[], payer?: string, changeSplitSats = 0, satsPerByte = 0.25) {
        const { data } = await axios.post(`${this.apiUrl}/pay`, PaymentRequest.serialize({
            rawtx: Buffer.from(rawtx, 'hex'),
            io: payments.map(p => ({
                script: Address.fromString(p.from).toTxOutScript().toBuffer(),
                satoshis: p.amount
            })),
            feeIo: {
                script: Address.fromString(payer).toTxOutScript().toBuffer(),
                satoshis: 0
            }
        }));

        return data.toString('hex');
    }

    async buildPayments(req: PaymentRequest): Promise<Buffer> {
        const { data: outTx } = await axios.post(`${this.apiUrl}/pay`, PaymentRequest.serialize(req));
        return outTx;
    }
}
