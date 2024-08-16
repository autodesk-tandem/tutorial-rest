/*
    This example demonstrates how to delete element from the model. For the simplicity the example locates element by name.
    Delete elements cane be restored using Restore function in the History panel.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { QC } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
const NAME = 'Delete me';

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });

    // STEP 2 - get facility
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);

    // STEP 3 - iterate through facility models and process elements
    let deletedElementCount = 0;

    for (const link of facility.links) {
        // STEP 4 - get elements and find one with given name
        const elements = await client.getElements(link.modelId);
        const elementsToDelete = [];

        for (const element of elements) {
            let name = element[QC.OName];

            name ??= element[QC.Name];
            if (name == NAME) {
                elementsToDelete.push(element[QC.Key]);
            }
        }
        // STEP 5 - delete elements
        if (elementsToDelete.length > 0) {
            console.log(`Deleting elements: ${elementsToDelete.length}`);
            await client.deleteElements(link.modelId, elementsToDelete, 'element-delete');
            deletedElementCount += elementsToDelete.length;
        }
    }
    console.log(`Total number of deleted elements: ${deletedElementCount}`);
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
