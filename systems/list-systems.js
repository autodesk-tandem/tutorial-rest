/*
    This example demonstrates how to get systems from facility and print their names.
    
    It uses 2-legged authentication - this requires ahat application is added to facility as service.
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

    // STEP 3 - iterate through facility models and collect systems
    for (const link of facility.links) {
        const systems = await client.getSystems(link.modelId);

        // STEP 4 - iterate through systems and print their names
        for (const system of systems) {
            let name = system[QC.OName];

            if (!name) {
               name = system[QC.Name];
            }
            console.log(`${name}`);
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
