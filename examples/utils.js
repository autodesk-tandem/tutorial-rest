const kModelIdSize = 16;
const kElementIdSize = 20;
const kElementFlagsSize = 4;
const kElementIdWithFlagsSize = kElementIdSize + kElementFlagsSize;

export class Encoding {
    /**
     * Converts element short key to full key.
     * @param {*} shortKey 
     * @param {boolean} [isLogical] 
     * @returns {string}
     */
    static toFullKey(shortKey, isLogical) {
        const binData = Buffer.from(shortKey, 'base64');
        const fullKey = Buffer.alloc(kElementIdWithFlagsSize);

        fullKey.writeInt32BE(isLogical ? 0x01000000: 0x00000000);
        binData.copy(fullKey, kElementFlagsSize);
        return Encoding.makeWebsafe(fullKey.toString('base64'));
    }

    /**
     * Creates xref key from modelId (without prefix) and full element key.
     * @param {string} modelId 
     * @param {string} key 
     * @returns {string}
     */
    static toXrefKey(modelId, key) {
        const modelBuff = Buffer.from(Encoding.makeWebsafe(modelId), 'base64');
        const elementBuff = Buffer.from(Encoding.makeWebsafe(key), 'base64');
        const result = Buffer.alloc(kModelIdSize + kElementIdWithFlagsSize);
        
        modelBuff.copy(result, 0);
        elementBuff.copy(result, kModelIdSize);
        return Encoding.makeWebsafe(result.toString('base64'));
    }

    /**
     * Returns URL safe string.
     * @param {string} text 
     * @returns {string}
     */
    static makeWebsafe(text) {
        return text.replace(/\+/g, '-') // Convert '+' to '-' (dash)
            .replace(/\//g, '_') // Convert '/' to '_' (underscore)
            .replace(/=+$/, ''); // Remove trailing '='
    }
}