/*
    This example demonstrates how to get read source properties (i.e. from Revit) from BIM element reference
    by assets.
    
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

const CATEGORY_NAME = 'Identity Data'
const PROPERTY_NAME = 'Type Name';

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
    // STEP 4 - get tagged assets from the default model
    const assets = await client.getTaggedAssets(defaultModel.modelId);
    // STEP 5 -build a map of model elements for quick lookup
    const modelElementsMap = new Map(); // modelId -> Set of elementIds
    const elementAssetMap = new Map(); // element xref -> asset

    for (const asset of assets) {
        const modelElementXref = asset[QC.BimElmOfAsset];

        // skip assets that do not have a BIM element reference
        if (!modelElementXref) {
            continue;
        }
        // STEP 6 - extract model ID and element ID from the BIM element reference
        const [ modelId, elementId ] = Encoding.fromXrefKey(modelElementXref);

        if (!modelElementsMap.has(modelId)) {
            modelElementsMap.set(modelId, new Set());
        }
        modelElementsMap.get(modelId).add(elementId);
        // STEP 7 - associate xref of BIM element with asset
        elementAssetMap.set(modelElementXref, asset);
    }
    // STEP 8 - iterate through facility models and process elements
    for (const [modelId, elementIds] of modelElementsMap.entries()) {
        const schema = await client.getModelSchema(modelId);
        // STEP 9 - find property
        const propDef = schema.attributes.find(p => p.fam === ColumnFamilies.Source && p.category === CATEGORY_NAME && p.name === PROPERTY_NAME);

        if (!propDef) {
            continue;
        }
        // STEP 10 - get elements and print out property value
        const elements = await client.getElements(modelId,
            Array.from(elementIds),
            [],
            [ QC.Name, QC.OName, propDef.id ]);

        for (const element of elements) {
            const prop = element[propDef.id];

            if (!prop) {
                continue;
            }
            // STEP 11 - find asset in the elementAssetMap using the BIM element xref
            const xref = Encoding.toXrefKey(modelId, element[QC.Key]);
            const asset = elementAssetMap.get(xref);

            if (!asset) {
                continue;
            }
            // STEP 12 - print out results
            const assetName = asset[QC.OName] ?? asset[QC.Name];
            const name = element[QC.OName] ?? element[QC.Name];

            console.log(`Asset: ${assetName}`);
            console.log(`  BIM Element: ${name} (${element[QC.Key]})`);
            console.log(`    ${propDef.displayName}: ${prop}`);
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
