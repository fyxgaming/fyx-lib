"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FyxOwner = void 0;
const axios_1 = __importDefault(require("axios"));
const bsv2_1 = require("bsv2");
const signed_message_1 = require("./signed-message");
const order_lock_regex_1 = __importDefault(require("./order-lock-regex"));
const FEE_RATE = 0.025;
const DUST_LIMIT = 273;
class FyxOwner {
    constructor(apiUrl, bip32, fyxId, userId, keyPair, feeAddress) {
        this.apiUrl = apiUrl;
        this.bip32 = bip32;
        this.fyxId = fyxId;
        this.userId = userId;
        this.keyPair = keyPair;
        this.feeAddress = feeAddress;
        this.keyPairs = new Map();
        this.feeRate = FEE_RATE;
        this._paymentAddress = bsv2_1.Address.fromPrivKey(bip32.derive('m/0/0').privKey);
        const batonPrivKey = bip32.derive('m/1/0').privKey;
        this._batonAddress = bsv2_1.Address.fromPrivKey(batonPrivKey);
        this.keyPairs.set(this._batonAddress.toTxOutScript().toHex(), bsv2_1.KeyPair.fromPrivKey(batonPrivKey));
        this.pubkey = keyPair.pubKey.toString();
    }
    get batonAddress() {
        return this._batonAddress.toString();
    }
    get paymentAddress() {
        return this._paymentAddress.toString();
    }
    async nextOwner() {
        const { data: { address } } = await axios_1.default.post(`${this.apiUrl}/accounts/${this.fyxId}/${this.userId}/payment-destination`, new signed_message_1.SignedMessage({ subject: 'GetPaymentDestination' }, this.userId, this.keyPair));
        return address;
    }
    async loadDerivations() {
        const { data: derivations } = await axios_1.default.post(`${this.apiUrl}/accounts/${this.fyxId}/${this.userId}/derivations`, new signed_message_1.SignedMessage({ subject: 'LoadDerivations' }, this.userId, this.keyPair));
        // console.log('Derivations:', derivations);
        derivations.forEach(d => {
            if (this.keyPairs.has(d.script))
                return;
            this.keyPairs.set(d.script, bsv2_1.KeyPair.fromPrivKey(this.bip32.derive(d.path).privKey));
        });
    }
    async sign(rawtx, parents, locks) {
        const tx = bsv2_1.Tx.fromHex(rawtx);
        await this.loadDerivations();
        await Promise.all(tx.txIns.map(async (txIn, i) => {
            const lockScript = bsv2_1.Script.fromHex(parents[i].script);
            if (!i && parents[0].script.match(order_lock_regex_1.default)) {
                const script = this.signOrderLock(tx, lockScript, new bsv2_1.Bn(parents[i].satoshis));
                txIn.setScript(script);
                return;
            }
            const txOut = bsv2_1.TxOut.fromProperties(new bsv2_1.Bn(parents[i].satoshis), lockScript);
            const keyPair = this.keyPairs.get(txOut.script.toHex());
            if (!keyPair) {
                // console.log('Missing Keypair:', txOut.script.toHex())
                return;
            }
            const sig = await tx.asyncSign(keyPair, bsv2_1.Sig.SIGHASH_ALL | bsv2_1.Sig.SIGHASH_FORKID, i, txOut.script, txOut.valueBn);
            txIn.setScript(new bsv2_1.Script().writeBuffer(sig.toTxFormat()).writeBuffer(keyPair.pubKey.toBuffer()));
        }));
        // console.log('Signed TX:', tx.toString());
        return tx.toHex();
    }
    getListingBase() {
        const tx = new bsv2_1.Tx();
        tx.addTxOut(new bsv2_1.Bn(546), this._batonAddress.toTxOutScript());
        return tx.toHex();
    }
    getPurchaseBase({ address, satoshis }) {
        const tx = new bsv2_1.Tx();
        tx.addTxOut(new bsv2_1.Bn(satoshis), bsv2_1.Address.fromString(address).toTxOutScript());
        if (this.feeAddress) {
            const tradingFee = Math.max(Math.floor(satoshis * this.feeRate), DUST_LIMIT);
            tx.addTxOut(new bsv2_1.Bn(tradingFee), bsv2_1.Address.fromString(this.feeAddress).toTxOutScript());
        }
        return tx.toHex();
    }
    signOrderLock(tx, script, valueBn) {
        const isCancel = tx.txOuts[0].script.isSafeDataOut();
        const preimage = tx.sighashPreimage(bsv2_1.Sig.SIGHASH_FORKID | (isCancel ? bsv2_1.Sig.SIGHASH_NONE : (bsv2_1.Sig.SIGHASH_SINGLE | bsv2_1.Sig.SIGHASH_ANYONECANPAY)), 0, script, valueBn, bsv2_1.Tx.SCRIPT_ENABLE_SIGHASH_FORKID);
        let asm;
        if (isCancel) {
            const bw = new bsv2_1.Bw();
            tx.txIns.forEach((txIn, i) => {
                if (i < 2)
                    return;
                bw.write(txIn.txHashBuf); // outpoint (1/2)
                bw.writeUInt32LE(txIn.txOutNum); // outpoint (2/2)  
            });
            const prevouts = bw.toBuffer();
            asm = `${preimage.toString('hex')} ${prevouts.toString('hex')} OP_TRUE`;
        }
        else {
            asm = `${preimage.toString('hex')} 00 OP_FALSE`;
        }
        return bsv2_1.Script.fromAsmString(asm);
        // tx.txIns[0].setScript(Script.fromAsmString(asm));
        // return tx.toHex();
    }
}
exports.FyxOwner = FyxOwner;
//# sourceMappingURL=fyx-owner.js.map