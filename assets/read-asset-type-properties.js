/*
    This example demonstrates how to get assets from facility and print asset and family type names.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies, QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
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
    // STEP 4 - fetch assets
    const assets = await client.getTaggedAssets(defaultModel.modelId);
    // STEP 5 - iterate through assets and collect related BIM elements
    const modelAssetMap = new Map();

    for (const asset of assets) {
        const modelElementXref = asset[QC.BimElmOfAsset];

        if (!modelElementXref) {
            continue;
        }
        const [modelId, elementId] = Encoding.fromXrefKey(modelElementXref);

        if (!modelAssetMap.has(modelId)) {
            modelAssetMap.set(modelId, []);
        }
        modelAssetMap.get(modelId).push({
            asset,
            elementId
        });
    }
    // STEP 6 - iterate through model-asset map
    for (const [modelId, assetElements ] of modelAssetMap.entries()) {
        const elementIds = new Set(assetElements.map(item => item.elementId));
        // STEP 7 - fetch BIM elements for the current model
        const elements = await client.getElements(modelId, Array.from(elementIds), [ ColumnFamilies.Standard, ColumnFamilies.Refs ]);
        // STEP 8 - organize elements by ID and collect family type IDs
        const elementsById = new Map(
            elements.map(element => [element[QC.Key], element])
        );
        const familyTypeIds = new Set(
            elements.map(element => element[QC.FamilyType]).filter(Boolean)
        );

        if (familyTypeIds.size === 0) {
            continue;
        }
        // STEP 9 - fetch family types and organize by ID
        const familyTypes = await client.getElements(modelId, Array.from(familyTypeIds), [ ColumnFamilies.Standard ]);
        const familyTypesById = new Map(
            familyTypes.map(type => [type[QC.Key], type])
        );
        // STEP 10 - iterate through asset elements and print asset and family type names
        for (const { asset, elementId } of assetElements) {
            const element = elementsById.get(elementId);
            const familyType = familyTypesById.get(element?.[QC.FamilyType]);

            if (!familyType) {
                continue;
            }
            const assetName = asset[QC.OName] ?? asset[QC.Name];
            const familyName = familyType[QC.OName] ?? familyType[QC.Name];

            console.log(`${assetName}: ${familyName}`);
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
