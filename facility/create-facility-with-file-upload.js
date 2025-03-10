/*
    This example demonstrates how to create facility from uploaded file.
    
    It uses 2-legged authentication.

    NOTE - the example uses API which is NOT DOCUMENTED at the moment:
        POST https://developer.api.autodesk.com/tandem/v1/groups/:groupId/twins
        POST https://developer.api.autodesk.com/tandem/v1/twins/:facilityId/template
        POST https://developer.api.autodesk.com/tandem/v1/twins/:facilityId/model
        POST https://developer.api.autodesk.com/tandem/v1/twins/:facilityId/import
        GET https://developer.api.autodesk.com/tandem/v1/models/:modelId/props
*/
import path from 'path';

import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ModelState, QC, } from '../common/constants.js';
import { readBinary, readJSON } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const GROUP_URN = 'YOUR_GROUP_URN'; // account where the facility will be created
const INPUT_MODEL_NAME = 'C:/Temp/racbasicsampleproject.rvt'; // local file to create facility from

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
                    'Building Name': 'Basic Sample',
                    'Address': '1 Market St. 4th Floor, San Francisco, CA, 94105',
                    'Owner': 'Jan Liska',
                    'Project Name': 'Basic Sample'
                }
            }
        }
    };
    const facilityResult = await client.createFacility(GROUP_URN, facilityInputs);
    const facilityId = facilityResult[QC.Key];

    console.log(`new facility: ${facilityId}`);
    // STEP 3 - read & apply facility template - we use data downloaded from Tandem app server
    const template = readJSON('./data/facilityTemplate.json');

    await client.applyFacilityTemplate(facilityId, template);
    // STEP 4 - create link to upload file to S3
    console.log(`uploading file: ${INPUT_MODEL_NAME}`);
    const uploadLink = await client.createUploadLink(facilityId, path.basename(INPUT_MODEL_NAME));
    // STEP 5 - upload file. Note it may not work for large files - in this case would be better to use streaming
    const fileContent = readBinary(INPUT_MODEL_NAME);

    const uploadResult = await fetch(uploadLink.url, {
        method: 'PUT',
        body: fileContent,
        headers: {
            'content-type': 'application/octet-stream'
        }
    });

    if (uploadResult.status !== 200) {
        throw new Error(`upload failed: ${uploadResult.status}`);
    }
    // STEP 6 - confirm upload
    await client.confirmUpload(facilityId, {
        name: uploadLink.name,
        fileName: uploadLink.fileName,
        key: uploadLink.key,
        url: uploadLink.url
    });
    // STEP 7 - create & import model
    console.log(`importing model: ${path.basename(INPUT_MODEL_NAME)}`);
    const modelInputs = {
        linkDef: {
            label: uploadLink.fileName,
            on: true
        },
        label: uploadLink.fileName,
        on: true,
        realFilename: uploadLink.fileName,
        urn: uploadLink.urn
    };
    const modelResult = await client.createModel(facilityId, modelInputs);
    
    await client.importModel(facilityId, {
        conversionMethod: 'v3',
        modelId: modelResult.modelId,
        phaseOrViewName: '',
        realFilename: uploadLink.name,
        roomAssignment: true,
        urn: uploadLink.urn
    });
    // STEP 8 - wait for import to finish
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
