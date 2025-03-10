/*
    This example demonstrates how to add new user to the facility.
    
    It uses 2-legged authentication - this requires that application is added to the account as service. The application should have Manage permission.

    NOTE - the example uses API which is NOT DOCUMENTED at the moment:
        PUT https://developer.api.autodesk.com/tandem/v1/twins/:facilityId/users/:userEmail
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { AccessLevel } from '../common/constants.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN'; // facility to add user to
const USER_EMAIL = 'YOUR_USER_EMAIL'; // user to add

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:write');
    const client = new TandemClient(() => {
        return token;
    });
    // STEP 2 - add user to the facility
    await client.updateFacilityUser(FACILITY_URN, USER_EMAIL, AccessLevel.Read);
    console.log('done');
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
