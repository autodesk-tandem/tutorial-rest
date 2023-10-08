/*
    This example demonstrates how to get assets from facility and print their type properties.
    
    It uses 2-legged authentication - this requires athat application is added to facility as service.
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
        const assets = await client.getTaggedAssets(link.modelId, [ ColumnFamilies.Standard, ColumnFamilies.DtProperties, ColumnFamilies.Refs ]);
        const assetTypes = new Set();
        const assetTypeMap = {};

        // STEP 4 - iterate through assets and collect asset types
        for (const asset of assets) {
            const familyType = asset[QC.FamilyType];

            if (!familyType) {
                continue;
            }
            var key = Encoding.toFullKey(familyType, true);

            assetTypes.add(key);
            assetTypeMap[asset.k] = key;
        }
        if (assetTypes.size === 0) {
            continue;
        }
        // STEP 5 - get type properties
        const familyTypes = await client.getElements(link.modelId, [... assetTypes]);

        for (const asset of assets) {
            const assetTypeKey = assetTypeMap[asset.k];

            if (!assetTypeKey) {
                continue;
            }
            // STEP 6 - print out asset name & asset type name
            const familyType = familyTypes.find(i => i.k === assetTypeKey);

            console.log(`${asset[QC.Name]}: ${familyType[QC.Name]}`);
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
