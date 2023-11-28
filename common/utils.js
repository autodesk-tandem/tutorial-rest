const kModelIdSize = 16;
const kElementIdSize = 20;
const kElementFlagsSize = 4;
const kElementIdWithFlagsSize = kElementIdSize + kElementFlagsSize;
const kRecordSize = 28;
const kSystemIdSize = 9;

export const ElementFlags = {
    SimpleElement:  0x00000000,
    Room:           0x00000005,
    FamilyType:     0x01000000,
    Level:          0x01000001,
    Stream:         0x01000003,
    System:         0x01000004
};

export const KeyFlags = {
    Physical:   0x00000000,
    Logical:    0x01000000
};

export const ColumnFamilies = {
    DtProperties:   'z',
    LMV:            '0',
    Standard:       'n',
    Systems:        'm',
    Refs:           'l',
    Xrefs:          'x'
};

export const ColumnNames = {
    BoundingBox:        '0',
    CategoryId:         'c',
    Classification:     'v',
    OClassification:    '!v',
    ElementFlags:       'a',
    Elevation:          'el',
    FamilyType:         't',
    Level:              'l',
    Name:               'n',
    OName:              '!n',
    Parent:             'p',
    Rooms:              'r',
    UniformatClass:     'u'
};

export const QC = {
    BoundingBox:        `${ColumnFamilies.LMV}:${ColumnNames.BoundingBox}`,
    Classification:     `${ColumnFamilies.Standard}:${ColumnNames.Classification}`,
    OClassification:    `${ColumnFamilies.Standard}:${ColumnNames.OClassification}`,
    ElementFlags:       `${ColumnFamilies.Standard}:${ColumnNames.ElementFlags}`,
    Elevation:          `${ColumnFamilies.Standard}:${ColumnNames.Elevation}`,
    FamilyType:         `${ColumnFamilies.Refs}:${ColumnNames.FamilyType}`,
    Level:              `${ColumnFamilies.Refs}:${ColumnNames.Level}`,
    Name:               `${ColumnFamilies.Standard}:${ColumnNames.Name}`,
    OName:              `${ColumnFamilies.Standard}:${ColumnNames.OName}`,
    Rooms:              `${ColumnFamilies.Refs}:${ColumnNames.Rooms}`,
    XParent:            `${ColumnFamilies.Xrefs}:${ColumnNames.Parent}`,
    Key:                `k`
};

export const MutateActions = {
    Insert: 'i'
};

export class Encoding {
    /**
     * Decodes bounding box of element from string
     * @param {string} text 
     * @param {object} offset 
     * @returns {object}
     */
    static decodeBBox(text, offset) {
        const buff = Buffer.from(text, 'base64');
        let minx = buff.readFloatLE(0) + offset.x;
        let miny = buff.readFloatLE(4) + offset.y;
        let minz = buff.readFloatLE(8) + offset.z;
        let maxx = buff.readFloatLE(12) + offset.x;
        let maxy = buff.readFloatLE(16) + offset.y;
        let maxz = buff.readFloatLE(20) + offset.z;

        for (let i = kRecordSize; i < buff.length; i += kRecordSize) {
            minx = Math.min(minx, buff.readFloatLE(i) + offset.x);
            miny = Math.min(miny, buff.readFloatLE(i + 4) + offset.y);
            minz = Math.min(miny, buff.readFloatLE(i + 8) + offset.z);
            maxx = Math.max(maxz, buff.readFloatLE(i + 12) + offset.x);
            maxy = Math.max(maxy, buff.readFloatLE(i + 16) + offset.y);
            maxz = Math.max(maxz, buff.readFloatLE(i + 20) + offset.z);
        }
        return { minx, miny, minz, maxx, maxy, maxz };
    }

    /**
     * Converts element short key to full key.
     * @param {string} shortKey 
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
     * Converts full key to short key.
     * @param {string} fullKey 
     * @returns {string}
     */
    static toShortKey(fullKey) {
        const binData = Buffer.from(fullKey, 'base64');
        const shortKey = Buffer.alloc(kElementIdSize);

        binData.copy(shortKey, 0, kElementFlagsSize);
        return Encoding.makeWebsafe(shortKey.toString('base64'));
    }

    /**
     * Encodes element key to system id
     * @param {string} key 
     * @returns {string}
     */
    static toSystemId(fullKey) {
        const buff = Buffer.from(fullKey, 'base64');
        let id = buff[buff.length - 4] << 24;
        
        id |= buff[buff.length - 3] << 16;
        id |= buff[buff.length - 2] << 8;
        id |= buff[buff.length - 1];
        const res = Buffer.alloc(kSystemIdSize);
        const offset = [0];

        const len = writeVarint(res, offset, id)
        const result = res.subarray(0, len).toString('base64').replaceAll('=', '');

        return result;
    }

    /**
     * Decodes array of keys from provided text.
     * @param {string} text 
     * @param {boolean} [useFullKeys] - if specified returns full keys, otherwise returns short keys. 
     * @param {boolean} [isLogical]  - when useFullKeys is true it specifies if key is logical or physical.
     * @returns {string[]}
     */
    static fromShortKeyArray(text, useFullKeys, isLogical) {
        const binData = Buffer.from(text, 'base64');
        let buff = Buffer.alloc(kElementIdSize);
        
        if (useFullKeys) {
            buff = Buffer.alloc(kElementIdWithFlagsSize);
        }
        const result = [];
        let offset = 0;

        while (offset < binData.length) {
            const size = binData.length - offset;

            if (size < kElementIdSize) {
                break;
            }
            if (useFullKeys) {
                buff.writeInt32BE(isLogical ? KeyFlags.Logical : KeyFlags.Physical);
                binData.copy(buff, kElementFlagsSize, offset, offset + kElementIdSize);
            } else {
                binData.copy(buff, 0, offset, offset + kElementIdSize);
            }
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

/**
 * Returns main model of the facility. Main model is the one marked with star in the UI.
 * @param {object} facilityData 
 * @returns {object}
 */
export function getMainModel(facilityData) {
    const mainModel = facilityData.links.find((m) => {
        return  m.main === true;
    });

    return mainModel;
}

/**
 * 
 * @param {*} buff 
 * @param {*} offset 
 * @param {*} value 
 * @returns 
 */
function writeVarint(buff, offset, value) {
    const startOffset = offset[0];

    do {
        let byte = 0 | (value & 0x7f);

        value >>>= 7;
        if (value) {
            byte |= 0x80;
        }
        buff[offset[0]++] = byte;
    } while (value);
    return offset[0] - startOffset;
}