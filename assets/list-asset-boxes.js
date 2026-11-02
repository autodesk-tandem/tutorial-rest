/*
    This example demonstrates how to get assets from facility and print their bounding box.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, QC } from '../common/constants.js';
import { getDefaultModel, Encoding } from '../common/utils.js';

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
    // STEP 4 - get tagged assets
    const assets = await client.getTaggedAssets(defaultModel.modelId, [ ColumnFamilies.Standard, ColumnFamilies.Xrefs ]);
    // STEP 5 - map to store offset for each model
    const modelOffsetMap = new Map();

    // STEP 6 - iterate through assets and print their bounding boxes
    for (const asset of assets) {
        const name = asset[QC.OName] ?? asset[QC.Name];

        console.log(`${asset[QC.Name]}`);
        // STEP 7 -find BIM element of an asset
        const modelElementXref = asset[QC.BimElmOfAsset];

        if (!modelElementXref) {
            console.log(` ERROR: Asset does not have a BIM element reference`);
            continue;
        }
        // STEP 8 - decode xref key to get model ID and element ID.
        // Use modelId to get the offset of the model
        const [ modelId, elementId ] = Encoding.fromXrefKey(modelElementXref);

        if (!modelOffsetMap.has(modelId)) {
            const modelMetadata = await client.getModel(modelId);

            modelOffsetMap.set(modelId, modelMetadata.fragmentTransformsOffset);
        }
        const offset = modelOffsetMap.get(modelId);
        // STEP 9 - get element details using model ID and element ID
        const element = await client.getElement(modelId, elementId, [ ColumnFamilies.Standard, ColumnFamilies.LMV ]);

        if (!element) {
            console.log(` ERROR: Unable to read BIM element reference`);
            continue;
        }
        // STEP 10 - extract bounding box data from element
        const bboxData = element[QC.BoundingBox];

        if (!bboxData) {
            console.log(` ERROR: BIM element does not have a bounding box`);
            continue;
        }
        // STEP 11 - bounding box is encoded into binary string
        const box = Encoding.decodeBBox(bboxData, offset);

        console.log(`  min: ${box.minx}, ${box.miny}, ${box.minz}`);
        console.log(`  max: ${box.maxx}, ${box.maxy}, ${box.maxz}`);
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
