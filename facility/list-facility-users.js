/*
    This example demonstrates how to get users of the facility.
    
    It uses 2-legged authentication - this requires that application is added to the account as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRER';
const FACILITY_URN = 'YOUR_FACILITY_URN'; // facility to query

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });
    // STEP 2 - get facility users
    const users = await client.getFacilityUsers(FACILITY_URN);

    for (const [userId, user] of Object.entries(users)) {
        console.log(`${userId}: ${user.name}`);
        console.log(`  ${user.accessLevel}`);
    }
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
