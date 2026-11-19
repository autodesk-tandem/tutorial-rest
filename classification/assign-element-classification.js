/*
    This example demonstrates how create assets for BIM elements and classify them. This is using hardcoded mapping between element name
    and classification. The example can be used as reference sample in case that more advanced logic is needed.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies, ColumnNames, MutateActions, QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });

    // STEP 2 - get facility & facility template
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const template = await client.getFacilityTemplate(facilityId);
    // this defines mapping between element name and classification
    const elementClassMap = {
        'Door - Interior - Double' : 'Interior Doors',
        'Door - Interior - Single' : 'Interior Doors',
        'Door - Exterior - Double' : 'Exterior Doors',
        'Door - Exterior - Single' : 'Exterior Doors'
    };
    // STEP 3 - build map between element name and classification id
    const classMap = new Map();

    for (const name in elementClassMap) {
        const className = elementClassMap[name];
        const classData = template.classification.rows.find(r => {
            return r[1] === className;
        });

        if (!classData) {
            console.log(`Classification not found for: ${className}`);
            continue;
        }
        classMap.set(name, classData[0]);
    }
    // STEP 4 - iterate through facility models and apply classification based on mapping
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    const assetClassMap = new Map();

    for (const link of facility.links) {
        // STEP 5 - skip default model - this is where assets are stored
        if (link.modelId === defaultModel.modelId) {
            continue;
        }
        // STEP 6 - iterate through elements in the model and prepare classification list
        console.log(`Processing model: ${link.label}`);
        const elements = await client.getElements(link.modelId, undefined, [ ColumnFamilies.Standard, ColumnFamilies.Xrefs ]);
        const elementClassList = []; // list of element id and classification id pairs

        for (const element of elements) {
            // STEP 7 - check if there is associated asset and skip if present
            const assetId = element[QC.HostOfAsset];

            if (assetId) {
                continue;
            }
            const elementName = element[QC.OName] ?? element[QC.Name];

            if (!classMap.has(elementName)) {
                continue;
            }
            const classId = classMap.get(elementName);
            const elementId = element[QC.Key];

            elementClassList.push({ elementId, classId });
            console.log(`  ${elementName}:${elementId}`);
        }
        if (elementClassList.length === 0) {
            continue;
        }
        // STEP 8 - create assets for collected BIM elements
        const result = await client.makeAssets(link.modelId,
            elementClassList.map(e => e.elementId), 'Create assets');

        result.keys.forEach((assetId, i) => {
            assetClassMap.set(assetId, elementClassList[i].classId);
        });
        console.log(`  Created assets: ${result.keys.length}`);
    }
    // STEP 9 - apply classification to created assets
    const assetIds = [];
    const mutations = [];

    for (const [assetId, classId] of assetClassMap.entries()) {
        assetIds.push(assetId);
        mutations.push([
            MutateActions.Insert,
            ColumnFamilies.Standard,
            ColumnNames.OClassification,
            classId
        ]);
    }
    if (assetIds.length === 0) {
        return;
    }
    await client.mutateElements(defaultModel.modelId, assetIds, mutations, 'Apply classification');
    console.log(`Applied classification: ${assetIds.length}`);
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
