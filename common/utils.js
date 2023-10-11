const kModelIdSize = 16;
const kElementIdSize = 20;
const kElementFlagsSize = 4;
const kElementIdWithFlagsSize = kElementIdSize + kElementFlagsSize;

export const ElementFlags = {
    SimpleElement:  0x00000000,
    Room:           0x00000005,
    FamilyType:     0x01000000,
    Level:          0x01000001,
    Stream:         0x01000003
};

export const KeyFlags = {
    Physical:   0x00000000,
    Logical:    0x01000000
};

export const ColumnFamilies = {
    DtProperties:   'z',
    Standard:       'n',
    Refs:           'l',
    Xrefs:          'x'
};

export const ColumnNames = {
    CategoryId:     'c',
    Classification: 'v',
    ElementFlags:   'a',
    Elevation:      'el',
    FamilyType:     't',
    Level:          'l',
    Name:           'n',
    Parent:         'p',
    Rooms:          'r',
    UniformatClass: 'u'
};

export const QC = {
    ElementFlags:   `${ColumnFamilies.Standard}:${ColumnNames.ElementFlags}`,
    Elevation:      `${ColumnFamilies.Standard}:${ColumnNames.Elevation}`,
    FamilyType:     `${ColumnFamilies.Refs}:${ColumnNames.FamilyType}`,
    Level:          `${ColumnFamilies.Refs}:${ColumnNames.Level}`,
    Name:           `${ColumnFamilies.Standard}:${ColumnNames.Name}`,
    Rooms:          `${ColumnFamilies.Refs}:${ColumnNames.Rooms}`,
    XParent:        `${ColumnFamilies.Xrefs}:${ColumnNames.Parent}`
};

export const MutateActions = {
    Insert: 'i'
};

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

        fullKey.writeInt32BE(isLogical ? KeyFlags.Logical : KeyFlags.Physical);
        binData.copy(fullKey, kElementFlagsSize);
        return Encoding.makeWebsafe(fullKey.toString('base64'));
    }

    /**
     * Decodes array of keys from provided text.
     * @param {string} key 
     * @returns {string[]}
     */
    static fromShortKeyArray(key) {
        const binData = Buffer.from(key, 'base64');
        const buff = Buffer.alloc(kElementIdWithFlagsSize);
        const result = [];
        let offset = 0;

        while (offset < binData.length) {
            const size = binData.length - offset;

            if (size < kElementIdSize) {
                break;
            }
            binData.copy(buff, kElementFlagsSize, offset, offset + kElementIdSize);
            const elementKey = Encoding.makeWebsafe(buff.toString('base64'));

            result.push(elementKey);
            offset += kElementIdSize;
        }
        return result;
    }

    /**
     * Creates pair of modelId and element key from xref key.
     * @param {string} xrefKey 
     * @returns {string[]}
     */
    static fromXrefKey(xrefKey) {
        const binData = Buffer.from(xrefKey, 'base64');
        const modelBuff = Buffer.alloc(kModelIdSize);

        binData.copy(modelBuff, 0);
        const modelId = Encoding.makeWebsafe(modelBuff.toString('base64'));
        const keyBuff = Buffer.alloc(kElementIdWithFlagsSize);

        binData.copy(keyBuff, 0, kModelIdSize);
        const key = Encoding.makeWebsafe(keyBuff.toString('base64'));

        return [ modelId, key ];
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

/**
 * Returns default model of the facility. Default model has same id as facility but different prefix.
 * @param {string} facilityId 
 * @param {object} facilityData 
 * @returns {object}
 */
export function getDefaultModel(facilityId, facilityData) {
    const defaultModelId = facilityId.replace('urn:adsk.dtt:', 'urn:adsk.dtm:');
    const defaultModel = facilityData.links.find((m) => {
        return  m.modelId === defaultModelId;
    });

    return defaultModel;
}