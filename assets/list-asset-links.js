/*
    This example demonstrates how to get URL for assets in the facility.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel, Encoding } from '../common/utils.js';

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
    // STEP 3 - get default model
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    // STEP 4 - iterate through assets
    const assets = await client.getTaggedAssets(defaultModel.modelId);

    for (const asset of assets) {
        // STEP 5 - get xref key and generate URL to view asset in Tandem
        const xrefKey = Encoding.toXrefKey(defaultModel.modelId, asset[QC.Key]);
        const url = `https://tandem.autodesk.com/pages/facilities/${facilityId}?selection=${xrefKey}`;
        // STEP 6 - print out asset name and URL
        const name = asset[QC.OName] ?? asset[QC.Name];

        console.log(`${name}: ${url}`);
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
