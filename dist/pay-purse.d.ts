export declare class PayPurse {
    private apiUrl;
    private apiKey;
    private doBroadcast;
    constructor(apiUrl: string, apiKey: string, doBroadcast?: boolean);
    pay(rawtx: string): Promise<string>;
    broadcast(rawtx: string): Promise<string>;
}
