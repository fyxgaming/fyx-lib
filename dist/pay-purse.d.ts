export declare class PayPurse {
    private apiUrl;
    private apiKey;
    constructor(apiUrl: string, apiKey: string);
    pay(rawtx: string): Promise<string>;
    broadcast(rawtx: string): Promise<string>;
}
