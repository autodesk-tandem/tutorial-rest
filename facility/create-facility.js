/*
    This example demonstrates how to create facility.
    
    It uses 2-legged authentication - this requires that application is added to the account as service. It's also using same token to access ACC/BIM360 so
    it's necessary to whitelist the aplication in ACC/BIM360.

    NOTE - the example uses API which is NOT SUPPORTED at the moment:
        POST https://developer.api.autodesk.com/tandem/v1/groups/:groupId/twins
        POST https://developer.api.autodesk.com/tandem/v1/twins/:facilityId/template
        POST https://developer.api.autodesk.com/tandem/v1/twins/:facilityId/model
        POST https://developer.api.autodesk.com/tandem/v1/twins/:facilityId/import
        GET https://developer.api.autodesk.com/tandem/v1/models/:modelId/props
*/
import fs from 'fs';
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ModelState, QC } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const GROUP_URN = 'YOUR_GROUP_URN';
const ACC_ACCOUNT_ID = 'YOUR_ACC_ACCOUNT_ID';
const ACC_PROJECT_ID = 'YOUR_ACC_PROJECT_ID';
const ACC_FOLDER_ID = 'YOUR_ACC_FOLDER_ID';
const INPUT_MODEL_NAME = 'racbasicsampleproject.rvt';

const MASTER_VIEW_NAME = '08f99ae5-b8be-4f8d-881b-128675723c10';

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has Manage permission which allows facility creation
    // note that it requires data:write scope
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });
    
    // STEP 2 - create facility
    const facilityInputs = {
        settings: {
            props: {
                'Identity Data': {
                    'Building Name': 'Test',
                    'Address': '1 Market St. 4th Floor, San Francisco, CA, 94105',
                    'Owner': 'Jan Liska',
                    'Project Name': 'Test Project'
                }
            }
        }
    };
    const facilityResult = await client.createFacility(GROUP_URN, facilityInputs);
    const facilityId = facilityResult[QC.Key];

    console.log(`new facility: ${facilityId}`);
    // STEP 3 - read & apply facility template - we use data downloaded from Tandem app server
    const template = await readFile('./data/facilityTemplate.json');

    await client.applyFacilityTemplate(facilityId, template);
    const facility = await client.getFacility(facilityId);

    console.log(facility);
    // STEP 3 - get documents from ACC/BIM360
    let document;

    for await (const doc of getDocuments(token, ACC_PROJECT_ID, ACC_FOLDER_ID, '.rvt')) {
        if (doc.name === INPUT_MODEL_NAME) {
            document = doc;
            break;
        }
    }
    if (!document) {
        return;
    }
    // STEP 4 - get views from document
    const manifest = await client.getManifest(document.urn);
    const views = getDocumentViews(manifest);

    if (views.length === 0) {
        throw new Error('unable to find suitable view');
    }
    // STEP 5 - import model
    const modelResult = await client.createModel(facilityId, {
        realFilename: document.name,
        docsProjectId: ACC_PROJECT_ID,
        docsAccountId: ACC_ACCOUNT_ID,
        linkDef: {
            label: document.name,
            on: true
        },
        urn: document.urn
    });

    console.log(`new model: ${modelResult.modelId}`);
    await client.importModel(facilityId, {
        modelId: modelResult.modelId,
        realFilename: document.name,
        urn: document.urn,
        phaseNames: [
            `view:${views[0]}`
        ],
        phaseOrViewName: `view:${views[0]}`,
        roomAssignment: true,
        conversionMethod: 'v3'
    });
    // STEP 6 - wait for import to finish
    let modelProps;
    let count = 0;

    // wait for 5 mins max
    while (count < 60) {
        modelProps = await client.getModelProps(modelResult.modelId);

        if ((modelProps.state.state === ModelState.Ready)  || (modelProps.state.state === ModelState.Failed)) {
            break;
        }
        await sleep(5000);
        count++;
    }
    if (modelProps.state.state === ModelState.Ready) {
        console.log(`facility succesfully created`);
    }
}

/**
 * Collects documents from given folder in Autodesk Docs. It's generator function which iterates through documents and returns them one by one.
 * It handles pagination under the hood.
 * 
 * @generator
 * @param {string} token - authentication token.
 * @param {string} projectId - ID of the project.
 * @param {string} folderId - ID of the folder.
 * @param {string} [fileType] - optional file type (i.e. ".rvt")
 * @yields {Promise<object>}
  */
async function* getDocuments(token, projectId, folderId, fileType) {
    let url = `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/contents`;

    if (fileType) {
        url += `?filter[displayName]-ends=${fileType}`;
    }
    while (url) {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const items = await res.json();
   
        for (const item of items.data) {
            const versionData = items.included.find(i => i.id === item.relationships.tip.data.id);

            yield {
                name: item.attributes.displayName,
                item: item.id,
                version: item.relationships.tip.data.id,
                urn: versionData?.relationships.derivatives.data.id
            };
        }
        if (items.links.next) {
            url = items.links.next.href;
        } else {
            url = null;
        }
    }
}

/**
 * Collects available views from document.
 * 
 * @param {object} manifest 
 * @returns {string[]}
 */
function getDocumentViews(manifest) {
    const viewNames = new Set();
    
    collectNodes(manifest, false, (n) => n.role === '3d' && (n.type === 'geometry'), (node, isMasterView) => {
        if (!isMasterView) {
            viewNames.add(node.name);
        }
    });
    return [...viewNames];
}

/**
 * Iterates trough manifest and collect nodes based on provided condition.
 * 
 * @param {object} node 
 * @param {boolean} isMasterView
 * @param {function(object, string): boolean} pred 
 * @param {function(object, boolean)} callback 
 */
function collectNodes(node, isMasterView, pred, callback) {
    if (node.name === MASTER_VIEW_NAME) {
        isMasterView = true;
    }
    if (!node.children) {
        return;
    }
    for (const childNode of node.children) {
        if (pred(childNode)) {
            callback(childNode, isMasterView);
        }
        collectNodes(childNode, isMasterView, pred, callback);
    }
}

/**
 * Reads data from local file.
 * 
 * @param {string} fileName 
 * @returns {Promise<object>}
 */
async function readFile(fileName) {
    return new Promise((resolve) => {
        fs.readFile(fileName, 'utf8', (err, contents) => {
            const data = JSON.parse(contents);

            resolve(data);
        });
    });
}

/**
 * Waits for specified time (in miliseconds).
 * 
 * @param {number} ms 
 * @returns 
 */
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
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
