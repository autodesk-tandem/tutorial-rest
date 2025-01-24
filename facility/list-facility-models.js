/*
    This example demonstrates how to list details of the facility. It prints original storage of model document in ACC/Docs.
    
    It uses 2-legged authentication - this requires that application is added to the account as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { Encoding } from '../common/utils.js';

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
    const facility = await client.getFacility(FACILITY_URN);
    
    // STEP 3 - iterate through models
    for (const link of facility.links) {
        const modelId = link.modelId;
        // STEP 4 - get model properties and convert URN to item ID
        const modelProps = await client.getModelProps(modelId);
        const itemId = urnToItemId(modelProps.dataSource.forgeUrn);

        // check if itemId points to ACC/Dodcs storage
        if (!itemId || !itemId.startsWith('urn:adsk.wip')) {
            continue;
        }
        // STEP 5 - get project data
        const project = await getProject(token, modelProps.dataSource.docsAccountId, modelProps.dataSource.docsProjectId);
        // STEP 6 - get item data
        const item = await getItem(token, modelProps.dataSource.docsProjectId, itemId);

        console.log(`${link.label}`);
        console.log(`  ${project.attributes.name}`);
        console.log(`    ${item.meta.attributes.pathInProject}/${item.meta.attributes.displayName}`);
    }
}

/**
 * Returns project data using Data Management API.
 * 
 * @param {string} token 
 * @param {string} accountId 
 * @param {string} projectId 
 * @returns {object}
 */
async function getProject(token, accountId, projectId) {
    const res = await fetch(`https://developer.api.autodesk.com/project/v1/hubs/${accountId}/projects/${projectId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (res.status !== 200) {
        throw new Error(`Failed to get project data: ${res.statusText}`);
    }
    const result = await res.json();
    
    return result.data;
}

/**
 * Returns item data using Data Management API.
 * 
 * @param {string} token 
 * @param {string} projectId 
 * @param {string} itemId 
 * @returns {object}
 */
async function getItem(token, projectId, itemId) {
    const input = {
        jsonapi: {
            version: '1.0'
        },
        data: {
            type: 'commands',
            attributes: {
                extension: {
                    type: 'commands:autodesk.core:ListItems',
                    version: '1.1.0',
                    data: {
                        includePathInProject: true
                    }
                }
            },
            relationships: {
                resources: {
                    data: [
                        {
                            id: itemId,
                            type: 'items'
                        }
                    ]
                }
            }
        }
    };
    const res = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/commands`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
    });
    if (res.status !== 200) {
        throw new Error(`Failed to get project data: ${res.statusText}`);
    }
    const result = await res.json();
    
    return result.data.relationships.resources.data[0];
}

/**
 * Converts base64 encoded URN to item ID.
 * 
 * @param {string} urn 
 * @returns {string}
 */
function urnToItemId(urn) {
    const buff = Encoding.decode(urn);
    const items = buff.split(':');

    if (items.length < 4) {
        return undefined;
    }
    const bucketKey = `${items[0]}:${items[1]}`;
    let lineageId = items[3];
    const index = lineageId.indexOf('?version=');
        
    lineageId = lineageId.substring(0, index);
    if (lineageId.startsWith('vf.')) {
        lineageId = lineageId.slice(3);
    }
    const result = `${bucketKey}:dm.lineage:${lineageId}`;
        
    return result;
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
