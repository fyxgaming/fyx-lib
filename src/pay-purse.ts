import axios from 'axios';

const API = 'https://sandbox.api.fyxgaming.com';

export class PayPurse {
    constructor(private apiKey: string) {}

    async pay (rawtx: string): Promise<string> {
        const { data } = await axios.post(`${API}/pay/${this.apiKey}`, {rawtx});

        return data.rawtx;
    }

    async broadcast(rawtx: string): Promise<string> {
        const { data: {txid} } = await axios.post(`${API}/broadcast`, {rawtx});
        return txid;
    }
}