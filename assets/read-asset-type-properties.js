/*
    This example demonstrates how to get assets from facility and print their type properties.
    
    It uses 2-legged authentication - this requires athat application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import {
    ColumnFamilies,
    Encoding,
    QC
} from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read');

    // STEP 2 - get facility
    const facilityId = FACILITY_URN;
    const facility = await getFacility(token, facilityId);

    // STEP 3 - iterate through facility models and collect tagged assets
    for (const link of facility.links) {
        const assets = await getTaggetAssets(token, link.modelId);
        const assetTypes = new Set();
        const assetTypeMap = {};

        // STEP 4 - map properties to schema and print out asset properties
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
        const familyTypeData = await getElementData(token, link.modelId, [... assetTypes]);

        for (const asset of assets) {
            const assetTypeKey = assetTypeMap[asset.k];

            if (!assetTypeKey) {
                continue;
            }
            const familyTypeDataItem = familyTypeData.find(i => i.k === assetTypeKey);

            console.log(`${asset[QC.Name]}: ${familyTypeDataItem[QC.Name]}`);
        }
    }   
}

/**
 * Returns facility based on given URN.
 * @param {string} token 
 * @param {string} urn 
 * @returns {Promise<object>}
 */
async function getFacility(token, urn) {
    const response = await fetch(`https://tandem.autodesk.com/api/v1/twins/${urn}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();

    return data;
}

/**
 * Returns asset elements from given model. Tagged asset is element with custom properties ('z' family).
 * @param {string} token 
 * @param {string} urn 
 * @returns {Promise<object[]>}
 */
async function getTaggetAssets(token, urn) {
    const inputs = {
        families: [ ColumnFamilies.Standard, ColumnFamilies.DtProperties, ColumnFamilies.Refs ],
        includeHistory: false,
        skipArrays: true
    };
    const response = await fetch(`https://tandem.autodesk.com/api/v2/modeldata/${urn}/scan`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inputs)
    });
    const data = await response.json();
    const results = [];

    for (const item of data) {
        const keys = Object.keys(item);
        const userProps = keys.filter(k => k.startsWith(`${ColumnFamilies.DtProperties}:`));

        if (userProps.length > 0) {
            results.push(item);
        }
    }
    return results;
}

/**
 * 
 * @param {string} token 
 * @param {string} urn 
 * @param {string[]} keys 
 * @returns {Promise<object[]>}
 */
async function getElementData(token, urn, keys) {
    const inputs = {
        keys: keys,
        families: [ ColumnFamilies.Standard ],
        includeHistory: false,
        skipArrays: true
    };
    const response = await fetch(`https://tandem.autodesk.com/api/v2/modeldata/${urn}/scan`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inputs)
    });

    const data = await response.json();

    return data;
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
