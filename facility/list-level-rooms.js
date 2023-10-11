/*
    This example demonstrates how to list all levels from facility and related rooms.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, ElementFlags, Encoding, QC } from '../common/utils.js';

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

    // STEP 3 - iterate through facility models and get all elements from them model
    for (const link of facility.links) {
        const elements = await client.getElements(link.modelId, undefined, [ ColumnFamilies.Standard, ColumnFamilies.Refs ]);
        const levelRoomMap = {};

        // STEP 4 - create map between rooms and their levels
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];

            if (element[QC.ElementFlags] !== ElementFlags.Room) {
                continue;
            }
            const levelRef = element[QC.Level];

            if (!levelRef) {
                continue;
            }
            // STEP 5 - decode level reference to key
            const levelKey = Encoding.fromShortKeyArray(levelRef, true);
            // store index of room in map
            let rooms = levelRoomMap[levelKey];

            if (!rooms) {
                rooms = [];
            }
            rooms.push(i);
            levelRoomMap[levelKey] = rooms;
        }
        // STEP 6 - iterate through levels and print names of related rooms
        // we reuse elements which already got from server and check type of element
        for (const element of elements) {
            if (element[QC.ElementFlags] !== ElementFlags.Level) {
                continue;
            }
            const roomIds = levelRoomMap[element[QC.Key]];

            if (!roomIds) {
                continue;
            }
            console.log(`${element[QC.Name]}`);
            // STEP 7 - iterate through related rooms and print their names
            for (const roomId of roomIds) {
                const room = elements[roomId];
            
                console.log(`  ${room[QC.Name]}`);
            }
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
