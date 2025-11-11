/*
    This example demonstrates how to create & upload linked document for given facility.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import fs from 'node:fs';
import path from 'node:path';
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CILIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
const FILE_PATH = 'FULL_PATH_TO_YOUR_FILE';

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
    // STEP 3 - get details about uploaded file
    const fileName = path.basename(FILE_PATH);
    const fileSize = fs.statSync(FILE_PATH).size;
    const doc = facility.docs.find(d => d.name === fileName);

    if (doc) {
        console.log(`Document ${fileName} already exists in facility`);
        return;
    }
    // STEP 4 - start upload
    const fileInput = {
        name: fileName,
        contentLength: fileSize
    };
    const fileUpload = await client.uploadDocument(facilityId, fileInput);
    // STEP 5 - upload file to the provided link
    const fileContent = fs.readFileSync(FILE_PATH);

    const response = await fetch(fileUpload.uploadLink,
        {
            method: 'PUT',
            headers: {
                'Content-Length': fileSize,
                'Content-Type': fileUpload.contentType
            },
            body: fileContent
        });

    if (!response.ok) {
        throw new Error(`File upload failed: ${response.status} - ${response.statusText}`);
    }
    // STEP 6 - complete upload
    const uploadInput = {
        docUrn: fileUpload.id
    };
    const uploadResult = await client.confirmDocumentUpload(facilityId, uploadInput);

    console.log(`Document uploaded: ${uploadResult.name} (id: ${uploadResult.id})`);
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
