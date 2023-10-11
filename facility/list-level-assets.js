/*
    This example demonstrates how to list all levels from facility and find assets for each level.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { Encoding, QC } from '../common/utils.js';

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

    // STEP 3 - iterate through facility models
    for (const link of facility.links) {
        const levels = await client.getLevels(link.modelId);
        const assets = await client.getTaggedAssets(link.modelId);

        // STEP 4 - iterate through levels
        for (const level of levels) {
            console.log(`${level[QC.Name]}`);
            // STEP 5 - iterate through assets
            for (const asset of assets) {
                const assetLevel = asset[QC.Level];

                if (!assetLevel) {
                    continue;
                }
                // STEP 8 - level needs to be decoded
                // if level key is matching to current level the we print out
                // asset name.
                const levelKey = Encoding.toFullKey(assetLevel, true);

                if (level.k === levelKey) {
                    console.log(`  ${asset[QC.Name]}`);
                }
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
