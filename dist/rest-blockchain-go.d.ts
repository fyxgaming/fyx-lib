/// <reference types="node" />
import { IUTXO } from './interfaces';
export declare class PaymentIO {
    script: Buffer;
    satoshis: number;
    splitSats?: number;
    maxSplits?: number;
    static serialize(io: PaymentIO): {
        [key: string]: any;
    };
}
export declare class PaymentRequest {
    rawtx: Buffer;
    io: PaymentIO[];
    feeIo: PaymentIO;
    static serialize(p: PaymentRequest): any;
}
export declare class RestBlockchain {
    apiUrl: string;
    network: string;
    constructor(apiUrl: string, network: string);
    get bsvNetwork(): string;
    broadcast(rawtx: any): Promise<any>;
    fetch(txid: string): Promise<string>;
    time(txid: string): Promise<number>;
    spends(txid: string, vout: number): Promise<string | null>;
    utxos(scriptHex: string): Promise<IUTXO[]>;
    utxoCount(scriptHex: string): Promise<number>;
    balance(scriptHex: string): Promise<number>;
    loadParents(rawtx: string): Promise<{
        script: string;
        satoshis: number;
    }[]>;
    applyPayments(rawtx: any, payments: {
        from: string;
        amount: number;
    }[], payer?: string, changeSplitSats?: number, satsPerByte?: number): Promise<any>;
    buildPayments(req: PaymentRequest): Promise<Buffer>;
}
