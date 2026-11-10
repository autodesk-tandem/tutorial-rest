/*
    This example demonstrates how to create ticket using REST API. The ticket is assigned to specified asset by its name.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies,
    ColumnNames,
    ElementFlags,
    MutateActions,
    QC,
    TC
} from './../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
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
    const assets = await client.getTaggedAssets(facilityId);
    const asset = assets.find(a => a[QC.OName] === ASSET_NAME || a[QC.Name] === ASSET_NAME);
    
    if (!asset) {
        throw new Error(`Unable to locate asset: ${ASSET_NAME}`);
    }
    const xref = Encoding.toXrefKey(defaultModel.modelId, asset[QC.Key]);

    // STEP 4 - get rooms and levels from parent asset
    const locationIds = asset[QC.OLocation] ?? asset[QC.Location];
    // STEP 5 - create payload for ticket connected to asset
    const flags = ElementFlags.Ticket;
    const mutations = [
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
            ColumnFamilies.Standard,
            ColumnNames.TandemCategory,
            TC.Ticket
        ],
        [
            MutateActions.Insert,
            ColumnFamilies.Standard,
            ColumnNames.Priority,
            'Medium'
        ],
        [
            MutateActions.Insert,
            ColumnFamilies.Standard,
            ColumnNames.OpenDate,
            new Date().toISOString().slice(0, 10) // format as 'YYYY-MM-DD';
        ],
        [
            MutateActions.Insert,
            ColumnFamilies.Xrefs,
            ColumnNames.Parent,
            xref
        ]
    ];

    if (locationIds) {
        mutations.push([
            MutateActions.Insert,
            ColumnFamilies.Xrefs,
            ColumnNames.Location,
            locationIds
        ]);
    }
    const inputs = {
        muts: mutations,
        desc: `Create ticket`
    };
    const ticketResult = await client.createElement(defaultModel.modelId, inputs);

    console.log(`Created new ticket: ${TICKET_NAME} (${ticketResult.key})`);
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
