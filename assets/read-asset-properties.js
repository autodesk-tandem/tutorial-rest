/*
    This example demonstrates how to get assets from facility and print their properties.
    
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

    // STEP 3 - iterate through facility models and collect tagged assets
    for (const link of facility.links) {
        const schema = await client.getModelSchema(link.modelId);
        const assets = await client.getTaggedAssets(link.modelId);

        for (const asset of assets) {
            // STEP 4 - map properties to schema and print out property name & value
            console.log(`${asset[QC.Name]}: ${asset.k}`);
            for (const propId of Object.keys(asset)) {
                const prop = schema.attributes.find(p => p.id === propId);

                if (!prop) {
                    continue;
                }
                console.log(`  ${prop.category}.${prop.name}: ${asset[propId]}`);
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
