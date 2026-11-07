/*
    This example demonstrates how find references to rooms for assets from the facility.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel, Encoding, isRoom } from '../common/utils.js';

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
        throw new Error(`Default model doesn't exist`);
    }
    // STEP 4 - get assets and build location map
    const assets = await client.getTaggedAssets(defaultModel.modelId);
    const locationIds = new Set();
    const assetLocations = new Map(); // assetId -> locationIds

    for (const asset of assets) {
        const locationId = asset[QC.OLocation] ?? asset[QC.Location];

        if (!locationId) {
            continue;
        }
        // STEP 5 - decode locationId and store for later
        // NOTE - location references are stored as encoded array of xrefs
        // but location are stored in default model so no need to store modelIds
        const [ _, elementIds ] = Encoding.fromXrefKeyArray(locationId);

        for (const elementId of elementIds) {
            locationIds.add(elementId);
        }
        // STEP 6 - remember locations for asset
        if (!assetLocations.has(asset[QC.Key])) {
            assetLocations.set(asset[QC.Key], new Set());
        }
        for (const elementId of elementIds) {
            assetLocations.get(asset[QC.Key]).add(elementId);
        }
    }
    // STEP 7 - query locations
    const elements = await client.getElements(defaultModel.modelId, Array.from(locationIds));
    const locationDetails = new Map(elements.map(e => [e[QC.Key], e]));

    // STEP 8 - print location details for each asset
    for (const asset of assets) {
        const name = asset[QC.OName] ?? asset[QC.Name];

        console.log(`Asset:${name}`);
        for (const elementId of assetLocations.get(asset[QC.Key]) ?? []) {
            const location = locationDetails.get(elementId);

            // STEP 9 - check if location is a room and print its name
            if (!location || !isRoom(location)) {
                continue;
            }
            const roomName = location[QC.OName] ?? location[QC.Name];

            console.log(`  Room: ${roomName}`);
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
