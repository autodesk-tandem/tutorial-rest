/*
    This example demonstrates how to list groups and their users.
    
    It uses 2-legged authentication - this requires that application is added to account as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read');
    const client = new TandemClient(() => {
        return token;
    });
    
    // STEP 2 - get groups
    const groups = await client.getGroups();

    // STEP 3 - iterate through groups and print their name and id
    for (const group of groups) {
        console.log(`${group.name}: ${group.urn}`);
        // STEP 4 - get group details and print related users
        const groupDetails = await client.getGroup(group.urn);

        for (const user of groupDetails.users) {
            console.log(`  ${user.id}: ${user.name}`);
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

