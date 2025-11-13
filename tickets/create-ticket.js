/*
    This example demonstrates how to create ticket using REST API. The ticket is assigned to specified asset by its name.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies,
    ColumnNames,
    ElementFlags,
    MutateActions,
    QC } from './../common/constants.js';
import { Encoding, getDefaultModel } from './../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

const TICKET_NAME = 'Ticket 01'; // Specify ticket name according to your conventions
const ASSET_NAME = 'Pump';  // Name of the asset to search for 

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });

    // STEP 2 - get facility and default model.
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error('Unable to find default model');
    }
    // STEP 3 - find asset by name. In case when there is multiple assets with same name the first one is selected.
    let xref;

    for (const l of facility.links) {
        const elements = await client.getElements(l.modelId);

        for (const element of elements) {
            const name = element[QC.OName] ?? element[QC.Name];

            if (name === ASSET_NAME) {
                // create xref key of an asset
                xref = Encoding.toXrefKey(l.modelId, Encoding.toFullKey(element[QC.Key], false));
                break;
            }
        }
        if (xref) {
            break;
        }
    }
    if (!xref) {
        throw new Error(`Unable to locate asset: ${ASSET_NAME}`);
    }
    // STEP 4 - create ticket connected to asset
    const flags = ElementFlags.Ticket;
    const newKey = Encoding.newElementKey(flags & ElementFlags.AllLogicalMask);
    const inputs = {
        keys: [],
        muts: [
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.Name,
                TICKET_NAME
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.ElementFlags,
                flags
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Xrefs,
                ColumnNames.Parent,
                xref
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.Priority,
                'Medium'
            ],
        ],
        desc: `Create ticket`
    };

    // repeat keys based on number of mutations
    inputs.keys = Array(inputs.muts.length).fill(newKey);
    await client.createElement(defaultModel.modelId, inputs);
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
