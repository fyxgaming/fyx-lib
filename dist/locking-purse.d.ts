import { KeyPair } from 'bsv2';
import { IBlockchain } from './iblockchain';
export declare class LockingPurse {
    keyPair: KeyPair;
    blockchain: IBlockchain;
    changeSplitSats: number;
    satsPerByte: number;
    address: string;
    private script;
    constructor(keyPair: KeyPair, blockchain: IBlockchain, changeSplitSats?: number, satsPerByte?: number);
    pay(rawtx: string, parents: {
        satoshis: number;
        script: string;
    }[]): Promise<string>;
    utxos(): Promise<any>;
    balance(): Promise<number>;
    utxoCount(): Promise<number>;
}
