/*
    This example demonstrates how to create stream using REST API. It uses 2-legged
    authentication - this requires that application is added to facility as service.
    The stream is assigned to specified room.
*/
async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken('YOUR_CLIENT_ID',
        'YOUR_CLIENT_SECRET', 'data:read data:write');

    // STEP 2 - get facility and default model. The default model has same id as facility but different prefix
    const facilityId = 'YOUR_FACILITY_URN';
    const facility = await getFacility(token, facilityId);
    const defaultModelId = facilityId.replace('urn:adsk.dtt:', 'urn:adsk.dtm:');
    const defaultModel = facility.links.find((m) => {
        return  m.modelId === defaultModelId;
    });

    if (!defaultModel) {
        throw new Error('Unable to find default model');
    }
    // STEP 3 - find room by name. We assume there is only one room with given name.
    const roomName = 'UNIT E-110';
    const uniformatClassId = 'D7070'; // this refers to Electronic Monitoring and Control
    const categoryId = 5031; // this refers to IoT Connections category
    const classification = '3d'; // this depends on facility template
    let targetRoomModelId = null;
    let targetRoom = null;

    // iterate through rooms
    for (const link of facility.links) {
        const rooms = await getRooms(token, link.modelId);
        const room = rooms.find(r => r['n:n'] === roomName);

        if (room) {
            targetRoom = room;
            targetRoomModelId = link.modelId.replace('urn:adsk.dtm:', '');
            break;
        }
    }
    if (!targetRoom) {
        throw new Error(`Room ${roomName} doesn't exist`);
    }
    // STEP 4 - find level. Level with same name should exist in default model.
    const levelKey = toFullKey(targetRoom['l:l'], true);
    const levelDetails = await getElementData(token, targetRoomModelId, levelKey);
    const levels = await getLevels(token, defaultModel.modelId);
    const targetLevel = levels.find(l => l['n:n'] === levelDetails['n:n']);

    if (!targetLevel) {
        throw new Error(`Level ${levelDetails['n:n']} doesn't exist`);
    }
    // STEP 5 - create new stream. First step is to encode keys for references. In our case host element and room are same.
    const parentXref = encodeXref(targetRoomModelId, targetRoom.k);
    // creeate new stream
    const streamId = await createStream(token,
        defaultModel.modelId,
        roomName,
        uniformatClassId,
        categoryId,
        classification,
        parentXref, // becuse stream is assigned to room we use same key for host & room
        parentXref, 
        targetLevel.k);

    console.log(`New stream: ${streamId}`);
    // STEP 6 - reset stream secrets
    await resetStreamsSecrets(token, defaultModel.modelId, [ streamId ]);
}

/**
 * Creates 2-legged token using provided inputs.
 * @param {string} clientID 
 * @param {string} clientSecret 
 * @param {string} scope 
 * @returns {Promise<string>}
 */
async function createToken(clientID, clientSecret, scope) {
    const auth = Buffer.from(`${clientID}:${clientSecret}`).toString('base64');
    const options = new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': scope
    });

    const tokenResponse = await fetch(`https://developer.api.autodesk.com/authentication/v2/token?${options}`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`
        }
    });

    const token = await tokenResponse.json();

    return token.access_token;
}

/**
 * Returns facility based on given URN.
 * @param {string} token 
 * @param {string} urn 
 * @returns {Promise<object>}
 */
async function getFacility(token, urn) {
    const response = await fetch(`https://tandem.autodesk.com/api/v1/twins/${urn}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();

    return data;
}

/**
 * Returns level elements from given model. The elements include standard (n) properties.
 * @param {string} token 
 * @param {string} urn 
 * @returns {Promise<object[]>}
 */
async function getLevels(token, urn) {
    const inputs = {
        families: [ 'n' ],
        includeHistory: false,
        skipArrays: true
    };
    const response = await fetch(`https://tandem.autodesk.com/api/v2/modeldata/${urn}/scan`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inputs)
    });

    const data = await response.json();
    const results = [];

    for (const item of data) {
        if ((item['n:a'] & 0x01000001) === 0x01000001) {
            results.push(item);
        }
    }
    return results;
}

/**
 * Returns room elements from given model. The elements include standard (n) and local ref (l) properties.
 * @param {string} token 
 * @param {string} urn 
 * @returns {Promise<object[]>}
 */
async function getRooms(token, urn) {
    const inputs = {
        families: [ 'n', 'l' ],
        includeHistory: false,
        skipArrays: true
    };
    const response = await fetch(`https://tandem.autodesk.com/api/v2/modeldata/${urn}/scan`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inputs)
    });

    const data = await response.json();
    const results = [];

    for (const item of data) {
        if ((item['n:a'] & 0x00000005) === 0x00000005) {
            results.push(item);
        }
    }
    return results;
}

/**
 * Returns data of given element. Includes standard (n) properties.
 * @param {string} token - Authentication token
 * @param {string} urn - URN of the model
 * @param {string} key - key to query for element data
 * @returns {Promise<object>}
 */
async function getElementData(token, urn, key) {
    const inputs = {
        keys: [ key ],
        families: [ 'n' ],
        includeHistory: false,
        skipArrays: true
    };
    const response = await fetch(`https://tandem.autodesk.com/api/v2/modeldata/${urn}/scan`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inputs)
    });

    const data = await response.json();

    if (data.length > 0) {
        return data[1];
    }
    return undefined;
}

/**
 * Creates new stream using provided data
 * @param {string} token - Authentication token
 * @param {string} urn - URN of the model
 * @param {string} name - Name of the stream
 * @param {string} uniformatClass 
 * @param {number} categoryId 
 * @param {string} [classification]
 * @param {string} [parentXref]
 * @param {string} [roomXref]
 * @param {string} [levelKey]
 * @returns 
 */
async function createStream(token, urn, name, uniformatClass, categoryId, classification, parentXref, roomXref, levelKey) {
    const inputs = {
        muts: [
            [ 'i', 'n', 'n', name ],
            [ 'i', 'n', 'a', 0x01000003 ], // this flag identifies stream
            [ 'i', 'n', 'u', uniformatClass ],
            [ 'i', 'n', 'c', categoryId ],

        ],
        desc: 'Create stream'
    };

    if (classification) {
        inputs.muts.push([ 'i', 'n', 'v', classification ]);
    }
    if (parentXref) {
        inputs.muts.push([ 'i', 'x', 'p', parentXref ]);
    }
    if (roomXref) {
        inputs.muts.push([ 'i', 'x', 'r', roomXref ]);
    }
    if (levelKey) {
        inputs.muts.push([ 'i', 'l', 'l', levelKey ]);
    }
    const response = await fetch(`https://tandem.autodesk.com/api/v1/modeldata/${urn}/create`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inputs)
    });

    const data = await response.json();

    return data.key;
}

/**
 * Resets secrets for given streams.
 * @param {string} token
 * @param {string} urn 
 * @param {string[]} streamIds 
 * @returns {Promise}
 */
async function resetStreamsSecrets(token, urn, streamIds) {
    const inputs = {
        keys: streamIds,
        hardReset: false
    };
    const response = await fetch(`https://tandem.autodesk.com/api/v1/models/${urn}/resetstreamssecrets`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inputs)
    });
}

/**
 * Converts short key to qualified key.
 * @param {string} shortKey 
 * @param {boolean} isLogical 
 * @returns {string}
 */
function toFullKey(shortKey, isLogical) {
    const binData = Buffer.from(shortKey, 'base64');
    const fullKey = Buffer.alloc(24);

    fullKey.writeInt32BE(isLogical ? 0x01000000: 0x00000000);
    binData.copy(fullKey, 4);
    return makeWebsafe(fullKey.toString('base64'));
}

/**
 * Returns URL safe string.
 * @param {string} text 
 * @returns {string}
 */
function makeWebsafe(text) {
	return text.replace(/\+/g, '-') // Convert '+' to '-' (dash)
		.replace(/\//g, '_') // Convert '/' to '_' (underscore)
		.replace(/=+$/, ''); // Remove trailing '='
}

/**
 * Encodes xref key from model id and element key.
 * @param {string} modelId
 * @param {string} key
 * @returns {string}
 */
function encodeXref(modelId, key) {
    const modelBuff = Buffer.from(makeWebsafe(modelId), 'base64');
    const elementBuff = Buffer.from(makeWebsafe(key), 'base64');
    const result = Buffer.alloc(40);
    
    modelBuff.copy(result, 0);
    elementBuff.copy(result, 16);
    return makeWebsafe(result.toString('base64'));
}

main()
    .then(() => {
        console.log('success');
        process.exit(0);
    })
    .catch((err) => {
        console.error('failure', err);
        process.exit(1);
    });

