/*
    This example demonstrates how to get assets from facility and print their properties.
    
    It uses 2-legged authentication - this requires athat application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import {
    ColumnFamilies,
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
        const schema = await getModelSchema(token, link.modelId);
        const assets = await getTaggetAssets(token, link.modelId);

        for (const asset of assets) {
            // STEP 4 - map properties to schema and print out propertu name & value
            console.log(`${asset[QC.Name]}: ${asset.k}`);
            for (const propId of Object.keys(asset)) {
                const prop = schema.attributes.find(p => p.id === propId);

                if (!prop) {
                    continue;
                }
                console.log(`  ${prop.category}.${prop.name}: ${asset[propId]}`);
            }
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
 * Returns schema for given model.
 * @param {string} token 
 * @param {string} urn 
 * @returns {Promise<object>}
 */
async function getModelSchema(token, urn) {
    const response = await fetch(`https://tandem.autodesk.com/api/v1/modeldata/${urn}/schema`, {
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
        families: [ ColumnFamilies.Standard, ColumnFamilies.DtProperties ],
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

main()
    .then(() => {
        console.log('success');
        process.exit(0);
    })
    .catch((err) => {
        console.error('failure', err);
        process.exit(1);
    });
