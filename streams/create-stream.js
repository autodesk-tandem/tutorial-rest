/*
    This example demonstrates how to create stream using REST API. The stream is assigned to specified room.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import {
    ColumnFamilies,
    ColumnNames,
    ElementFlags,
    Encoding,
    MutateActions,
    QC,
    getDefaultModel } from './../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

const ROOM_NAME = 'UNIT E-110'; // Use room name based on your facility
const CLASSIFICATION_ID = '3d';  // Use classification id based on your facility template

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');

    // STEP 2 - get facility and default model.
    const facilityId = FACILITY_URN;
    const facility = await getFacility(token, facilityId);
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error('Unable to find default model');
    }
    // STEP 3 - find room by name. We assume there is only one room with given name.
    const roomName = ROOM_NAME;
    const uniformatClassId = 'D7070'; // this refers to Electronic Monitoring and Control
    const categoryId = 5031; // this refers to IoT Connections category
    const classification = CLASSIFICATION_ID;
    let targetRoomModelId = null;
    let targetRoom = null;

    // iterate through rooms
    for (const link of facility.links) {
        const rooms = await getRooms(token, link.modelId);
        const room = rooms.find(r => r[QC.Name] === roomName);

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
    const levelKey = Encoding.toFullKey(targetRoom[QC.Level], true);
    const levelDetails = await getElementData(token, targetRoomModelId, levelKey);
    const levels = await getLevels(token, defaultModel.modelId);
    const targetLevel = levels.find(l => l[QC.Name] === levelDetails[QC.Name]);

    if (!targetLevel) {
        throw new Error(`Level ${levelDetails[QC.Name]} doesn't exist`);
    }
    // STEP 5 - create new stream. First step is to encode keys for references. In our case host element and room are same.
    const parentXref = Encoding.toXrefKey(targetRoomModelId, targetRoom.k);
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
    // to push data to stream follow other stream examples
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
        families: [ ColumnFamilies.Standard ],
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
        if ((item[QC.ElementFlags] & ElementFlags.Level) === ElementFlags.Level) {
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
        families: [ ColumnFamilies.Standard, ColumnFamilies.Refs ],
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
        if ((item[QC.ElementFlags] & ElementFlags.Room) === ElementFlags.Room) {
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
        families: [ ColumnFamilies.Standard ],
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
            [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Name, name ],
            [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.ElementFlags, ElementFlags.Stream ], // this flag identifies stream
            [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.UniformatClass, uniformatClass ],
            [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.CategoryId, categoryId ],

        ],
        desc: 'Create stream'
    };

    if (classification) {
        inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Classification, classification ]);
    }
    if (parentXref) {
        inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, parentXref ]);
    }
    if (roomXref) {
        inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Rooms, roomXref ]);
    }
    if (levelKey) {
        inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Refs, ColumnNames.Level, levelKey ]);
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

main()
    .then(() => {
        console.log('success');
        process.exit(0);
    })
    .catch((err) => {
        console.error('failure', err);
        process.exit(1);
    });
