/*
    This example demonstrates how to close a ticketusing REST API.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, ColumnNames, MutateActions, QC } from '../common/constants.js';
import { getDefaultModel } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

const TICKET_NAME = 'Ticket 01';

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
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
    // STEP 3 - get ticket elements and find the one to close.
    const tickets = await client.getTickets(defaultModel.modelId);
    const ticket = tickets.find(t => (t[QC.OName] ?? t[QC.Name]) === TICKET_NAME);

    if (!ticket) {
        throw new Error(`Unable to find ticket: ${TICKET_NAME}`);
    }
    // STEP 4 - prepare mutation to set CloseDate property to today's date.
    const mutations = [];
    const keys = [];
    const closeDate = new Date().toISOString().slice(0, 10); // format as 'YYYY-MM-DD';

    keys.push(ticket[QC.Key]);
    mutations.push([
        MutateActions.Insert,
        ColumnFamilies.Standard,
        ColumnNames.CloseDate,
        closeDate]);
    
    // STEP 5 - update elements
    await client.mutateElements(defaultModel.modelId,
        keys,
        mutations,
        `Close ticket`);

    console.log(`done`);
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
