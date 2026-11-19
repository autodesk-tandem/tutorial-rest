/*
    This example demonstrates how to create stream using REST API. The stream is assigned to specified room.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, QC } from './../common/constants.js';
import { Encoding, getDefaultModel } from './../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

const ROOM_NAME = 'UNIT E-110'; // Use room name based on your facility
const CLASSIFICATION_ID = '3d';  // Use classification id based on your facility template
const TANDEM_CATEGORY = 'Q.Se';  // ID of Tandem category for sensors

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });

    // STEP 2 - get facility and default model.
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error('Unable to find default model');
    }
    const roomName = ROOM_NAME;
    const uniformatClassId = 'D7070'; // this refers to Electronic Monitoring and Control
    const categoryId = 5031; // this refers to IoT Connections category
    const classification = CLASSIFICATION_ID;
    // STEP 3 - find room by name. We assume there is only one room with given name.
    const rooms = await client.getRooms(defaultModel.modelId, [ ColumnFamilies.Standard, ColumnFamilies.Refs ]);
    const targetRoom = rooms.find(r => r[QC.OName] ?? r[QC.Name] === roomName);

    if (!targetRoom) {
        throw new Error(`Room ${roomName} doesn't exist`);
    }
    // STEP 4 - find level from the room
    const targetLevel = await client.getElement(defaultModel.modelId, targetRoom[QC.Parent]);

    if (!targetLevel) {
        console.warn(`Level ${targetRoom[QC.Parent]} doesn't exist`);
    }
    // STEP 5 - create new stream. First step is to encode keys for references. In our case host element and room are same.
    const parentXref = Encoding.toXrefKey(defaultModel.modelId, targetRoom[QC.Key]);
    // create new stream
    const streamId = await client.createStream(defaultModel.modelId,
        roomName,
        uniformatClassId,
        categoryId,
        classification,
        TANDEM_CATEGORY,
        parentXref, // because stream is assigned to room we use same key for host & room
        parentXref, 
        targetLevel?.[QC.Key]);

    console.log(`New stream: ${streamId}`);
    // STEP 6 - reset stream secrets
    await client.resetStreamsSecrets(defaultModel.modelId, [ streamId ]);
    // to push data to stream follow other stream examples
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
