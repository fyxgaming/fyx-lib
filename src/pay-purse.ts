import axios from 'axios';

export class PayPurse {
    constructor(private apiUrl: string, private apiKey: string, private doBroadcast = true) {}

    async pay (rawtx: string): Promise<string> {
        const { data } = await axios.post(`${this.apiUrl}/pay/${this.apiKey}`, {rawtx});

        return data.rawtx;
    }

    async broadcast(rawtx: string): Promise<string> {
        if(!this.doBroadcast) return;
        const { data: {txid} } = await axios.post(`${this.apiUrl}/broadcast`, {rawtx});
        return txid;
    }
}