import fs from 'node:fs';
import {v4 as uuidv4} from 'uuid';

import {
    kElementFlagsSize,
    kElementIdSize,
    kElementIdWithFlagsSize,
    kModelIdSize,
    kRecordSize,
    kSystemIdSize,
    ElementFlags,
    KeyFlags,
    SystemClassNames
} from './constants.js';

export class Encoding {
    /**
     * Decodes base64 encoded string.
     * 
     * @param {string} text 
     * @returns {string}
     */
    static decode(text) {
        const buff = Buffer.from(text, 'base64');

        return buff.toString('ascii');
    }

    /**
     * Encodes text to base64.
     * 
     * @param {string} text 
     * @returns {string}
     */
    static encode(text) {
        const buff = Buffer.from(text, 'ascii');

        return Encoding.makeWebsafe(buff.toString('base64'));
    }

    /**
     * Decodes bounding box of element from string.
     * 
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
     * Decodes stream settings from base64 encoded string.
     * 
     * @param {string} text 
     * @returns {object}
     */
    static decodeStreamSettings(text) {
        const settings = Encoding.decode(text);

        if (!settings) {
            return null;
        }
        const settingsObj = JSON.parse(settings);

        return settingsObj;
    }

    /**
     * Decodes stream settings from base64 encoded string.
     * 
     * @param {object} settings 
     * @returns {string}
     */
    static encodeStreamSettings(settings) {
        const text = JSON.stringify(settings);
        
        return Encoding.encode(text);
    }

    /**
     * Checks if given key is a full element key.
     * 
     * @param {string} key
     * @returns {boolean}
     */
    static isFullKey(key) {
        const binData = Buffer.from(key, 'base64');

        return binData.length === kElementIdWithFlagsSize;
    }

    /**
     * Checks if given key is a xref key.
     * 
     * @param {string} key
     * @returns {boolean}
     */
    static isXrefKey(key) {
        const binData = Buffer.from(key, 'base64');

        return binData.length === (kModelIdSize + kElementIdWithFlagsSize);
    }

    /**
     * Creates new element key.
     * 
     * @param {number} keyFlags 
     * @returns {string}
     */
    static newElementKey(keyFlags) {
        const buff = Buffer.alloc(kElementIdWithFlagsSize);

        buff.writeInt32BE(keyFlags);
        uuidv4({}, buff, 4);
        return this.makeWebsafe(buff.toString('base64'));
    }

    /**
     * Converts Tandem element key to Revit GUID.
     * 
     * @param {string} key 
     * @returns {string}
     */
    static toElementGUID(key) {
        const buff = Buffer.from(key, 'base64');
        
        // convert to array of hex characters
        const hex = Array.from(buff, (b) => {
            return (`0${(b & 0xFF).toString(16)}`).slice(-2);
        }).join('').split('');
        // create Revit guid
        const hexGroups = [ 8, 4, 4, 4, 12 ];
		let pos = 0;
        let result = [];

		for (let i = 0; i < hexGroups.length; i++) {
            let len = hexGroups[i];

            result.push(hex.slice(pos, pos + len).join(''));
            pos += len;
		}
        if (pos < hex.length) {
            result.push(hex.slice(pos).join(''));
        }
		return result.join('-');
    }

    /**
     * Converts element short key to full key.
     * 
     * @param {string} shortKey 
     * @param {boolean} isLogical 
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
     * @param {string} fullKey 
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

        return [ `urn:adsk.dtm:${modelId}`, key ];
    }

    /**
     * Decodes array of keys and returns arrays of modelIds and element keys.
     * 
     * @param {string} text - input string;
     * @returns {Array<Array<string>, string>}
     */
    static fromXrefKeyArray(text) {
        const modelKeys = [];
        const elementKeys = [];

        if (!text) {
            return [ modelKeys, elementKeys ];
        }
        const binData = Buffer.from(text, 'base64');
        const modelBuff = Buffer.alloc(kModelIdSize);
        const keyBuff = Buffer.alloc(kElementIdWithFlagsSize);
        let offset = 0;

        while (offset < binData.length) {
            const size = binData.length - offset;

            if (size < (kModelIdSize + kElementIdWithFlagsSize)) {
                break;
            }
            binData.copy(modelBuff, offset);
            const modelKey = Encoding.makeWebsafe(modelBuff.toString('base64'));

            modelKeys.push(modelKey);
            // element key
            binData.copy(keyBuff, 0, offset + kModelIdSize);
            const elementKey = Encoding.makeWebsafe(keyBuff.toString('base64'));

            elementKeys.push(elementKey);
            offset += (kModelIdSize + kElementIdWithFlagsSize);
        }
        return [ modelKeys, elementKeys ];
    }

    /**
     * Creates xref key from modelId (without prefix) and full element key.
     * @param {string} modelId 
     * @param {string} key 
     * @returns {string}
     */
    static toXrefKey(modelId, key) {
        if (modelId.startsWith('urn:')) {
            modelId = modelId.replace('urn:adsk.dtm:', '');
        }
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
 * 
 * @param {string} facilityId 
 * @param {object} facilityData 
 * @returns {object}
 */
export function getDefaultModel(facilityId, facilityData) {
    const defaultModelId = getDefaultModelId(facilityId);
    const defaultModel = facilityData.links.find((m) => {
        return  m.modelId === defaultModelId;
    });

    return defaultModel;
}

/**
 * Returns id of default model.
 * 
 * @param {string} facilityId 
 * @returns {string}
 */
export function getDefaultModelId(facilityId) {
    return facilityId.replace('urn:adsk.dtt:', 'urn:adsk.dtm:');
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
 * Returns true if the element is a logical element.
 * 
 * @param {number} elementFlags 
 * @returns {boolean}
 */
export function isLogicalElement(elementFlags) {
    return (elementFlags === ElementFlags.Stream ||
        elementFlags === ElementFlags.Level ||
        elementFlags === ElementFlags.GenericAsset ||
        elementFlags === ElementFlags.System ||
        elementFlags === ElementFlags.Ticket);
}

/**
 * Checks if classification b is based on classification a.
 * 
 * @param {string} a 
 * @param {string} b 
 * @returns {boolean}
 */
export function matchClassification(a, b) {
    let bLength = b.length;

	while(b[bLength - 1] == '0' && b[bLength-2] === '0') {
		const c = b[bLength - 3];

		if (c === ' ' || c === '.') {
            bLength -= 3;
        } else {
            break;
        }
	}
	// 'startsWith' ignoring non-alphanumeric.
	let ai = 0, ac = a.charCodeAt(ai),
		bi = 0, bc = b.charCodeAt(bi);

	while (ai < a.length && bi < bLength) {
		if (ac !== bc)  {
            return false;
        }
		ai += 1;
		while(ai < a.length && !isAlphaNumeric(ac = a.charCodeAt(ai))) {
            ai += 1;
        }
		bi += 1;
		while(bi < bLength && !isAlphaNumeric(bc = b.charCodeAt(bi)))  {
            bi += 1;
        }
	}
	return bi === bLength;

}

/**
 * Reads binary data from local file.
 * 
 * @param {string} fileName 
 * @returns {Buffer}
 */
export function readBinary(fileName) {
    const fileContent = fs.readFileSync(fileName);

    return fileContent;
}

/**
 * Reads JSON data from local file.
 * 
 * @param {string} fileName 
 * @returns {any}
 */
export function readJSON(fileName) {
    const fileContent = fs.readFileSync(fileName, 'utf8');
    const data = JSON.parse(fileContent);

    return data;
}

/**
 * Check if character is alphanumeric.
 * 
 * @param {number} code 
 * @returns {boolean}
 */
function isAlphaNumeric(code) {
	return code && // code 0 is not alphanumeric
		(code > 47 && code < 58) || // 0-9
		(code > 64 && code < 91) || // A-Z
		(code > 96 && code < 123);  // a-z
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

/**
 * Converts endcoded system class flags to array class names.
 *
 * @param {number} flags
 * @returns {Array<string>}
 */
export function systemClassToList(flags) {
    if (!flags) {
        return [];
    }
    const result = [];

	for (let i = 0; i < SystemClassNames.length; i++) {
		if (flags & (1 << i)) {
			result.push(SystemClassNames[i]);
		}
	}
	return result;
}
