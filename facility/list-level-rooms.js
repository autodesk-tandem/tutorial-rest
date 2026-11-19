/*
    This example demonstrates how to list all levels from facility and related rooms.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies, QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel, isLevel, isRoom } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read');
    const client = new TandemClient(() => {
        return token;
    });

    // STEP 2 - get facility
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);

    // STEP 3 - get default model and iterate
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    // STEP 4 - get all elements from the default model
    const elements = await client.getElements(defaultModel.modelId, undefined, [ ColumnFamilies.Standard, ColumnFamilies.Refs ]);
    const levelRoomMap = new Map();

    // STEP 5 - create map between rooms and their levels
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];

        if (!isRoom(element)) {
            continue;
        }
        const levelRef = element[QC.Parent];

        if (!levelRef) {
            continue;
        }
        // STEP 6 - store index of room in map
        const rooms = levelRoomMap.get(levelRef) ?? [];

        rooms.push(i);
        levelRoomMap.set(levelRef, rooms);
    }
    // STEP 7 - iterate through levels and print names of related rooms
    // we reuse elements which we already got from server and skip elements which aren't of type level
    for (const element of elements) {
        if (!isLevel(element)) {
            continue;
        }
        const levelKey = element[QC.Key];
        const roomIds = levelRoomMap.get(levelKey);

        if (!roomIds) {
            continue;
        }
        const levelName = element[QC.OName] ?? element[QC.Name];

        console.log(`${levelName}`);
        // STEP 8 - iterate through related rooms and print their names
        for (const roomId of roomIds) {
            const room = elements[roomId];
            const roomName = room[QC.OName] ?? room[QC.Name];

            console.log(`  ${roomName}`);
        }
    }
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
