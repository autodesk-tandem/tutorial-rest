/*
    This example demonstrates how to check state of systems in the  facility.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import {
    ColumnFamilies,
    ElementFlags,
    QC,
    SystemState } from '../common/constants.js';
import {
    Encoding,
    getDefaultModel,
    isLogicalElement
} from '../common/utils.js';

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
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);

    // STEP 3 - iterate through systems and check their staus
    const defaultModel = getDefaultModel(facilityId, facility);
    const systems = await client.getSystems(defaultModel.modelId);

    for (const system of systems) {
        const key = Encoding.toFullKey(system[QC.Key], isLogicalElement(system[QC.ElementFlags]));
        const name = system[QC.OName] ?? system[QC.Name];
        const parent = system[QC.Parent];

        // skip subsystems
        if (parent) {
            continue;
        }
        console.info(`Processing system: ${name} (${key})`);
        // STEP 4 - check state of the system
        const state = system[QC.State];

        if (state === SystemState.Dirty) {
            console.warn(`  System is in dirty state. It needs to be updated.`);
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
