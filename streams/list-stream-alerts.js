/*
    This example demonstrates how to list last stream alerts.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies, QC, StreamAlertState } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel } from '../common/utils.js';

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
    // STEP 2 - get facility and default model. The default model has same id as facility
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    // STEP 3 - get streams
    const streams = await client.getStreams(defaultModel.modelId);
    const streamByKey = new Map(
        streams.map(stream => [stream[QC.Key], stream])
    );
    // STEP 4 - get model schema
    const schema = await client.getModelSchema(defaultModel.modelId);
    const propDefsById = new Map(
        schema.attributes.filter(attr => attr.fam === ColumnFamilies.DtProperties)
        .map(attr => [attr.id, attr]));
    // STEP 5 - get stream alerts
    const streamAlerts = await client.getStreamAlerts(defaultModel.modelId);

    for (const [key, alerts] of Object.entries(streamAlerts)) {
        // STEP 6 - find related stream
        const stream = streamByKey.get(key);

        if (!stream) {
            console.log(`  Stream with key ${key} not found`);
            continue;
        }
        const name = stream[QC.OName] ?? stream[QC.Name];

        console.log(`Stream: ${name}`);
        // STEP 7 - iterate and print alert details
        for (const [propId, alert] of Object.entries(alerts)) {
            const propDef = propDefsById.get(propId);

            if (!propDef) {
                console.log(`  Property: ${propId} (definition not found)`);
                continue;
            }
            console.log(`  Property: ${propDef.name} (${propId})`);
            console.log(`    Current state: ${StreamAlertState[alert.currentState] ?? alert.currentState}`);
            console.log(`    Previous state: ${StreamAlertState[alert.previousState] ?? alert.previousState}`);
            console.log(`    Time: ${new Date(alert.notificationTimestamp).toLocaleString()}`);
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
