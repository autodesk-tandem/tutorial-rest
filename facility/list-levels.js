/*
    This example demonstrates how to list all levels from facility.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { QC } from '../common/constants.js';

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

    // STEP 3 - iterate through facility models and print level name + elevation
    for (const link of facility.links) {
        const schema = await client.getModelSchema(link.modelId);
        const levels = await client.getLevels(link.modelId);

        for (const level of levels) {
            // STEP 4 - find elevation property
            const prop = schema.attributes.find(a => a.id === QC.Elevation);

            console.log(`${level[QC.Name]}:${level[prop.id]}`);
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
