/*
    This example demonstrates how to list hierarchy of locations.

    It uses 2-legged authentication - this requires that application is added to the account as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies, ElementFlags, QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { Encoding, getDefaultModel } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_APS_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_APS_CLIENT_SECRET';
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
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    // STEP 3 - fetch elements and collect locations
    const elements = await client.getElements(defaultModel.modelId, undefined,
        [ ColumnFamilies.Standard, ColumnFamilies.Refs ]);
    const locationById = new Map();
    const parentChildMap = new Map();
    const topLocations = [];

    for (const element of elements) {
        const elementKey = element[QC.Key];
        const flags = Encoding.getElementFlags(elementKey);

        if (flags === ElementFlags.Location) {
            locationById.set(elementKey, element);
            // STEP 4 - build parent-child relationships for locations
            const parentKey = element[QC.Parent];

            if (parentKey) {
                if (!parentChildMap.has(parentKey)) {
                    parentChildMap.set(parentKey, []);
                }
                parentChildMap.get(parentKey).push(elementKey);
            } else {
                topLocations.push(elementKey);
            }
        }
    }
    // STEP 5 - print the location hierarchy starting from top locations
    for (const locationId of topLocations) {
        printTree(locationId, locationById, parentChildMap);
    }
}

/**
 * Prints the location hierarchy starting from the given key.
 * 
 * @param {string} key 
 * @param {Map<string, any>} locationById 
 * @param {Map<string, string[]>} parentChildMap 
 * @param {number} depth 
 */
function printTree(key, locationById, parentChildMap, depth = 0) {
    const location = locationById.get(key);
    const name = location[QC.OName] ?? location[QC.Name];

    console.log(`${'  '.repeat(depth)}${name} (${key})`);
    const children = parentChildMap.get(key) ?? [];

    for (const child of children) {
        printTree(child, locationById, parentChildMap, depth + 1);
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
