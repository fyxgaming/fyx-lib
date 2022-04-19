export declare class PayPurse {
    private apiKey;
    constructor(apiKey: string);
    pay(rawtx: string): Promise<string>;
    broadcast(rawtx: string): Promise<string>;
}
