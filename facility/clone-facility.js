/*
    This example demonstrates how to copy facility.
    
    It uses 2-legged authentication - this requires that application is added to the account as service.

    NOTE - the example uses API which is NOT SUPPORTED at the moment:
        POST https://developer.api.autodesk.com/tandem/v1/groups/:groupId/twins
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { QC } from './../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const GROUP_URN = 'YOUR_GROUP_URN';
const FACILITY_URN = 'YOUR_FACILITY_URN';

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has Manage permission which allows facility creation
    // note that it requires data:write scope
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });
    
    // STEP 2 - clone existing facility
    const facilityInputs = {
        clone: {
            fromTwinUrn: FACILITY_URN
        }
    };
    const facilityResult = await client.createFacility(GROUP_URN, facilityInputs);
    const facilityId = facilityResult[QC.Key];

    console.log(`new facility: ${facilityId}`);
    // STEP 3 - wait until facility is created
    let facilityExists = false;
    let count = 0;
    
    while (count < 60) {
        const group = await client.getGroup(GROUP_URN);

        if (group.twins[facilityId]) {
            facilityExists = true;
            break;
        }
        await sleep(5000);
        count++;
    }
    if (!facilityExists) {
        console.error(`Failed to copy facility: ${FACILITY_URN}`);
        return;
    }
    // STEP 4 - get facility details
    const facility = await client.getFacility(facilityId);
    // STEP 5 - update facility name (add  suffix to existing name)
    const name = facility.props['Identity Data']['Building Name'];
    
    facility.props['Identity Data']['Building Name'] = `${name} - Copy`;
    // read etag from details
    const etag = Number.parseInt(facility['etag']);

    // remove unused fields
    delete facility['template'];
    delete facility['etag'];
    // STEP 6 - update facility data
    await client.updateFacility(facilityId, facility, etag);
    console.log(`facility succesfully copied. New facility: ${facilityId}`);
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
