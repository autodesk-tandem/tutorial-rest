/*
    This example demonstrates how find references to rooms for elements of the model.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, ElementFlags, QC } from '../common/constants.js';
import { Encoding } from '../common/utils.js';

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
        const roomIndexMap = {};

        // STEP 4 - remember indexes of room elements
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];

            if (element[QC.ElementFlags] === ElementFlags.Room) {
                roomIndexMap[element[QC.Key]] = i;
            }
        }
        // STEP 5 - check if element has reference to rooms. If so then decode keys of referenced
        // rooms and print their names.
        for (const element of elements) {
            const refKeys = element[QC.Rooms];

            if (!refKeys) {
                continue;
            }
            console.log(`${element[QC.Name]}`);
            const roomKeys = Encoding.fromShortKeyArray(refKeys);

            for (const roomKey of roomKeys) {
                const room = elements[roomIndexMap[roomKey]];

                if (!room) {
                    continue;
                }
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
