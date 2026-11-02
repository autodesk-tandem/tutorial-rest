/*
    This example demonstrates how to list all levels from facility.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel } from '../common/utils.js';

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
    // STEP 3 - get default model and schema
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    const schema = await client.getModelSchema(defaultModel.modelId);
    // STEP 4 - iterate through levels of the facility and print level name + elevation
    const levels = await client.getLevels(defaultModel.modelId);

    for (const level of levels) {
        // STEP 4 - find elevation property
        const prop = schema.attributes.find(a => a.id === QC.Elevation);
        const name = level[QC.OName] ?? level[QC.Name];

        console.log(`${name}:${level[prop?.id]}`);
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
