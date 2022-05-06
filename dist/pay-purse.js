"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayPurse = void 0;
const axios_1 = __importDefault(require("axios"));
class PayPurse {
    constructor(apiUrl, apiKey) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
    }
    async pay(rawtx) {
        const { data } = await axios_1.default.post(`${this.apiUrl}/pay/${this.apiKey}`, { rawtx });
        return data.rawtx;
    }
    async broadcast(rawtx) {
        const { data: { txid } } = await axios_1.default.post(`${this.apiUrl}/broadcast`, { rawtx });
        return txid;
    }
}
exports.PayPurse = PayPurse;
//# sourceMappingURL=pay-purse.js.map