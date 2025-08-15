/*
    This example demonstrates how to list all tickets for the facility using REST API.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { QC } from './../common/constants.js';
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

    // STEP 4 - iterate through tickets and print their properties
    for (const ticket of tickets) {
        const ticketName = ticket[QC.OName] ?? ticket[QC.Name];

        console.log(`${ticketName}`);
        // priority is optional
        const priority = ticket[QC.Priority];

        if (priority) {
            console.log(`  Priority: ${priority}`);
        }
        // STEP 5 - decode reference to linked asset and print its name.
        const xref = ticket[QC.XParent];

        if (xref) {
            const [ modelId, elementId ] = Encoding.fromXrefKey(xref);

            const element = await client.getElement(modelId, elementId);
            const elementName = element[QC.OName] ?? element[QC.Name];

            console.log(`  Element: ${elementName}`);
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
