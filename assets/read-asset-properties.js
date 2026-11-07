/*
    This example demonstrates how to get assets from facility and print their properties.
    
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

    // STEP 3 - get default model and its schema
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    const schema = await client.getModelSchema(defaultModel.modelId);
    // STEP 4 - get tagget assets
    const assets = await client.getTaggedAssets(defaultModel.modelId);
    const count = assets.length;

    for (const asset of assets) {
        // STEP 5 - map properties to schema and print out property name & value
        // first check for name override, if empty then use default name
        const name = asset[QC.OName] ?? asset[QC.Name];

        console.log(`${name}: ${asset[QC.Key]}`);
        for (const propId in asset) {
            const prop = schema.attributes.find(p => p.id === propId);

            if (!prop) {
                continue;
            }
            console.log(`  ${prop.category}.${prop.name}: ${asset[propId]}`);
        }
    }
    console.log(`Total assets: ${count}`);
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
