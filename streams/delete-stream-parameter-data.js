/*
    This example demonstrates how to delete data for given parameter from specific stream.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, Encoding, QC, getDefaultModel } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
const STREAM_NAME = 'Temperature Sensor';
const PARAMETER_NAME = 'Temperature';

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });
    
    // STEP 2 - get facility and default model. The default model has same id as facility
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const defaultModel = getDefaultModel(facilityId, facility);
    // STEP 3 - get model schema. It is needed to find parameter id.
    const schema = await client.getModelSchema(defaultModel.modelId);
    // STEP 4 - get streams and find stream by name
    const streams = await client.getStreams(defaultModel.modelId);
    const stream = streams.find(s => s[QC.Name] === STREAM_NAME);

    if (!stream) {
        throw new Error(`Stream ${STREAM_NAME} not found`);
    }
    // STEP 5 - get stream data - we use full key because getStreamData expects full key
    const streamKey = Encoding.toFullKey(stream[QC.Key], true);
    const streamData = await client.getStreamData(defaultModel.modelId, streamKey);
    // STEP 6 - find substream by parameter name
    let propDef;

    for (const item in streamData) {
        const pd = schema.attributes.find(p => p.fam === ColumnFamilies.DtProperties && p.id === item);

        if (pd?.name === PARAMETER_NAME) {
            propDef = pd;
            break;
        }
    }
    if (!propDef) {
        throw new Error(`Parameter ${PARAMETER_NAME} not found`);
    }
    // STEP 7 - delete stream data. Note that we delete all data. If needed it's possible to
    // use from,to parameters to delete data for specific time range only.
    await client.deleteStreamsData(defaultModel.modelId, [ streamKey ], [ propDef.id ]);
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

