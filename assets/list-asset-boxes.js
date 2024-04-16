/*
    This example demonstrates how to get assets from facility and print their bounding box.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, Encoding, QC } from '../common/utils.js';

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
        const modelMetadata = await client.getModel(link.modelId);
        const assets = await client.getTaggedAssets(link.modelId, [ ColumnFamilies.Standard, ColumnFamilies.DtProperties, ColumnFamilies.LMV ]);
        const offset = modelMetadata.fragmentTransformsOffset;

        // STEP 4 - iterate through assets and print their bounding boxes
        for (const asset of assets) {
            console.log(`${asset[QC.Name]}`);
            const bboxData = asset[QC.BoundingBox];

            if (!bboxData) {
                continue;
            }
            // bounding box is encoded into binary string
            const box = Encoding.decodeBBox(asset[QC.BoundingBox], offset);

            console.log(`  min: ${box.minx}, ${box.miny}, ${box.minz}`);
            console.log(`  max: ${box.maxx}, ${box.maxy}, ${box.maxz}`);
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
