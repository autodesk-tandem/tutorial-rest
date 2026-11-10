/*
    This example demonstrates how to list tickets related to assets using REST API.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies, QC } from './../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { Encoding, getDefaultModel } from './../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';


async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read');
    const client = new TandemClient(() => {
        return token;
    });

    // STEP 2 - get facility and default model. Ticket elements are stored in default model.
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error('Unable to find default model');
    }
    // STEP 3 - get ticket elements.
    const tickets = await client.getTickets(defaultModel.modelId);

    // STEP 4 - iterate through tickets and build map between assets and tickets
    const assetTicketsMap = new Map();
    const modelAssetMap = new Map();

    for (const ticket of tickets) {
        const [modelIds, elementKeys] = Encoding.fromXrefKeyArray(ticket[QC.XParent]);

        for (let i = 0; i < modelIds.length; i++) {
            const modelId = modelIds[i];
            const elementKey = elementKeys[i];

            if (!modelAssetMap.has(modelId)) {
                modelAssetMap.set(modelId, new Set());
            }
            modelAssetMap.get(modelId).add(elementKey);
            if (!assetTicketsMap.has(elementKey)) {
                assetTicketsMap.set(elementKey, new Set());
            }
            assetTicketsMap.get(elementKey).add(ticket);
        }
    }
    // STEP 5 - retrieve asset details and print tickets per asset
    for (const [modelId, elementKeys] of modelAssetMap) {
        const assets = await client.getElements(modelId, [...elementKeys], [ColumnFamilies.Standard]);

        for (const asset of assets) {
            const assetName = asset[QC.OName] ?? asset[QC.Name];
            const tickets = assetTicketsMap.get(asset[QC.Key]) || new Set();

            console.log(`Asset: ${assetName} (${asset[QC.Key]}) Tickets: ${tickets.size}`);
            for (const ticket of tickets) {
                const ticketName = ticket[QC.OName] ?? ticket[QC.Name];
                const ticketPriority = ticket[QC.Priority];

                console.log(`  ${ticketName} (Priority: ${ticketPriority})`);
            }
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
