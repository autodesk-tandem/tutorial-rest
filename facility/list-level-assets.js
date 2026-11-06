/*
    This example demonstrates how to list levels from facility and find assets for each level.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { Encoding, getDefaultModel, isLevel } from '../common/utils.js';

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
    // STEP 3 - get default model
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error('Default model not found.');
    }
    // STEP 4 - fetch assets and map them to their locations
    const assets = await client.getTaggedAssets(defaultModel.modelId);
    const locationIds = new Set();
    const locationAssetMap = new Map();
    
    for (const asset of assets) {
        const location = asset[QC.OLocation] ?? asset[QC.Location];

        if (!location) {
            continue;
        }
        const [_, elementIds] = Encoding.fromXrefKeyArray(location);

        locationIds.add(...elementIds);
        // STEP 5 - store mapping from location element to assets
        for (const elementId of elementIds) {
            if (!locationAssetMap.has(elementId)) {
                locationAssetMap.set(elementId, new Set());
            }
            locationAssetMap.get(elementId).add(asset);
        }
    }
    // STEP 6 - fetch locations and iterate through them
    const locations = await client.getElements(defaultModel.modelId, Array.from(locationIds));

    for (const location of locations) {
        if (!isLevel(location)) {
            continue;
        }
        const levelName = location[QC.OName] ?? location[QC.Name];
        
        console.log(`${levelName}`);
        // STEP 7 - find assets for given location and print their names
        const assets = locationAssetMap.get(location[QC.Key]) ?? [];

        for (const asset of assets) {
            const assetName = asset[QC.OName] ?? asset[QC.Name];

            console.log(`  ${assetName}`);
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
