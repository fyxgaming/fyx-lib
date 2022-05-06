"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestBlockchain = exports.PaymentRequest = exports.PaymentIO = void 0;
const axios_1 = __importDefault(require("axios"));
const bsv_1 = require("bsv");
const crypto_1 = require("crypto");
class PaymentIO {
    static serialize(io) {
        return {
            s: io.script.toString('base64'),
            i: io.satoshis,
            ss: io.splitSats || 0,
            ms: io.maxSplits || 0
        };
    }
}
exports.PaymentIO = PaymentIO;
class PaymentRequest {
    static serialize(p) {
        return {
            r: p.rawtx.toString('base64'),
            i: p.io.map(PaymentIO.serialize),
            f: PaymentIO.serialize(p.feeIo)
        };
    }
}
exports.PaymentRequest = PaymentRequest;
;
class RestBlockchain {
    constructor(apiUrl, network) {
        this.apiUrl = apiUrl;
        this.network = network;
    }
    get bsvNetwork() {
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
        const { data: txid } = await (0, axios_1.default)({
            method: 'POST',
            url: `${this.apiUrl}/broadcast`,
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            data: Buffer.from(rawtx, 'hex')
        });
        return txid;
    }
    async fetch(txid) {
        const { data } = await (0, axios_1.default)({
            method: 'GET',
            url: `${this.apiUrl}/tx/${txid}`,
            responseType: 'arraybuffer'
        });
        return data.toString('hex');
    }
    ;
    async time(txid) {
        return Date.now();
    }
    async spends(txid, vout) {
        const { data } = await (0, axios_1.default)({
            method: 'GET',
            url: `${this.apiUrl}/spends/${txid}/${vout}`,
            responseType: 'arraybuffer'
        });
        return data.toString('hex');
    }
    async utxos(scriptHex) {
        const script = bsv_1.Script.fromHex(scriptHex);
        const scripthash = (0, crypto_1.createHash)('sha256').update(script.toBuffer()).digest().reverse();
        const { data: utxos } = await (0, axios_1.default)(`${this.apiUrl}/utxos/${scripthash.toString('hex')}`);
        return utxos.map(({ t, v: vout, s: satoshis }) => ({
            txid: Buffer.from(t, 'base64').toString('hex'),
            vout,
            satoshis,
            script: scriptHex
        }));
    }
    ;
    async utxoCount(scriptHex) {
        const script = bsv_1.Script.fromHex(scriptHex);
        const scripthash = (0, crypto_1.createHash)('sha256').update(script.toBuffer()).digest().reverse();
        const { data: count } = await (0, axios_1.default)(`${this.apiUrl}/utxos/${scripthash.toString('hex')}/count`);
        return count;
    }
    async balance(scriptHex) {
        const script = bsv_1.Script.fromHex(scriptHex);
        const scripthash = (0, crypto_1.createHash)('sha256').update(script.toBuffer()).digest().reverse();
        const { data: balance } = await (0, axios_1.default)(`${this.apiUrl}/utxos/${scripthash.toString('hex')}/balance`);
        return balance;
    }
    async loadParents(rawtx) {
        const tx = bsv_1.Tx.fromHex(rawtx);
        return Promise.all(tx.txIns.map(async (txIn) => {
            const txid = Buffer.from(txIn.txHashBuf).reverse().toString('hex');
            const rawtx = await this.fetch(txid);
            const t = bsv_1.Tx.fromHex(rawtx);
            const txOut = t.txOuts[txIn.txOutNum];
            return { script: txOut.script.toHex(), satoshis: txOut.valueBn.toNumber() };
        }));
    }
    async applyPayments(rawtx, payments, payer, changeSplitSats = 0, satsPerByte = 0.25) {
        const { data } = await axios_1.default.post(`${this.apiUrl}/pay`, PaymentRequest.serialize({
            rawtx: Buffer.from(rawtx, 'hex'),
            io: payments.map(p => ({
                script: bsv_1.Address.fromString(p.from).toTxOutScript().toBuffer(),
                satoshis: p.amount
            })),
            feeIo: {
                script: bsv_1.Address.fromString(payer).toTxOutScript().toBuffer(),
                satoshis: 0
            }
        }));
        return data.toString('hex');
    }
    async buildPayments(req) {
        const { data: outTx } = await axios_1.default.post(`${this.apiUrl}/pay`, PaymentRequest.serialize(req));
        return outTx;
    }
}
exports.RestBlockchain = RestBlockchain;
//# sourceMappingURL=rest-blockchain-go.js.map