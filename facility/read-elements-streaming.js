/*
    This example demonstrates how to get elements using streaming. This is more efficient compared to traditional approach, especially when dealing
    with large amounts of data.
    
    It uses 2-legged authentication - this requires athat application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { QC } from '../common/utils.js';

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

    // STEP 3 - iterate through models
    for (const link of facility.links) {
        console.log(`${link.label}`);
        // STEP 4 - iterate through model elements using async interator
        let count = 0;

        for await (const element of client.getElementStream(link.modelId)) {
            console.log(`  ${element[QC.Name]}: ${element[QC.Key]}`);
            count++;
        }
        console.log(`  Element count: ${count}`);
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
