/*
    This example demonstrates how to get URL for assets in the facility.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { KeyFlags, QC } from '../common/constants.js';
import { Encoding, getDefaultModel } from '../common/utils.js';

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

    // STEP 3 - iterate through facility models and their assets
    for (const link of facility.links) {
        const assets = await client.getTaggedAssets(link.modelId);

        for (const asset of assets) {
            // STEP 4 - get full key and generate URL to view asset in Tandem
            const isLogical = (asset[QC.ElementFlags] & KeyFlags.Logical) !== 0;
            const fullKey = Encoding.toFullKey(asset[QC.Key], isLogical);
            const xrefKey = Encoding.toXrefKey(link.modelId, fullKey);
            const url = `https://tandem.autodesk.com/pages/facilities/${facilityId}?selection=${xrefKey}`;
            // STEP 5 - print out asset name and URL
            const name = asset[QC.OName] ?? asset[QC.Name];

            console.log(`${name}: ${url}`);
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
