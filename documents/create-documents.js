/*
    This example demonstrates how to create linked documents for given facility.
    
    It uses 2-legged authentication - this requires that application is added to facility as service. It's also using same token to access ACC/BIM360 so it's necessary
    to whiteliste aplication in ACC/BIM360.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
const ACC_ACCOUNT_ID = 'YOUR_ACC_ACCOUNT_ID';
const ACC_PROJECT_ID = 'YOUR_ACC_PROJECT_ID';
const ACC_FOLDER_ID = 'YOUR_ACC_FOLDER_ID';

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    // note that it requires data:write scope
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });
    
    const facilityId = FACILITY_URN;
    // STEP 2 - get facility
    const facility = await client.getFacility(facilityId);
    // STEP 3 - get documents from ACC/BIM360. Note getDocuments returns async generator thus we need to use for await...of to process results
    let docs = [];

    for await (const doc of getDocuments(token, ACC_PROJECT_ID, ACC_FOLDER_ID)) {
        docs.push(doc);
    }
    // STEP 4 - filter out documents which are already imported into facility
    if (facility.docs) {
        docs = docs.filter(d => {
            return facility.docs?.findIndex(i => i.accAccountId === ACC_ACCOUNT_ID && i.accProjectId === ACC_PROJECT_ID && i.accLineage === d.item && i.accVersion === d.version) < 0;
        });
    }
    const docInputs = docs.map(d => {
        return {
            accAccountId: ACC_ACCOUNT_ID,
            accProjectId: ACC_PROJECT_ID,
            accLineage: d.item,
            accVersion: d.version,
            name: d.name
        };
    });
    // STEP 5 - import documents to facility & print out their name
    if (docInputs.length === 0) {
        throw new Error(`Nothing to import`);
    }
    const results = await client.createDocuments(facilityId, docInputs);

    console.log(results.status);
    for (const doc of results.data) {
        console.log(`${doc.name}: ${doc.id}`);
    }
}

/**
 * Returns documents from given folder. It's generator function which handles pagination under the hood in case that folder contains large number of files.
 * 
 * @generator
 * @param {string} url 
 * @param {string} fileName
 * @yields {Promise<object>} 
 */
async function* getDocuments(token, projectId, folderId) {
    let url = `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/contents`;

    while (url) {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const items = await res.json();
   
        for (const item of items.data) {
            yield {
                name: item.attributes.displayName,
                item: item.id,
                version: item.relationships.tip.data.id,
            };
        }
        if (items.links.next) {
            url = items.links.next.href;
        } else {
            url = null;
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
