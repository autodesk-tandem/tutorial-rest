/*
    This example demonstrates how to handle stream updates. It uses  WebSocket to receive notification about stream changes - note this API is not public
    at the moment.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import WebSocket from 'ws';
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { QC } from './../common/constants.js';
import { Encoding } from './../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID, APS_CLIENT_SECRET, 'data:read');
    const client = new TandemClient(() => {
        return token;
    });
    // STEP 2 - get id of default model
    const modelId = FACILITY_URN.replace('urn:adsk.dtt', 'urn:adsk.dtm');
    // STEP 3 - get model schema
    const schema = await client.getModelSchema(modelId);
    // STEP 4 - get available streams and buind map of stream id to name
    const streams = await client.getStreams(modelId);
    const streamMap = new Map();

    for (const stream of streams) {
        const streamId = Encoding.toFullKey(stream[QC.Key], true);
        const name = stream[QC.OName] ?? stream[QC.Name];

        streamMap.set(streamId, name);
    }
    // STEP 5 - create web socket connection and subscribe to stream updates
    const ws = new WebSocket('wss://tandem.autodesk.com/api/v1/msgws',
        [],
        {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );

    ws.on('open', () => {
        console.log('connected');
        ws.send(`/subscribe/${modelId}`);
    });
    // STEP 6 - process incoming messages. We pass streamMap and schema to processMessage function.
    // Note that we don't handle cases when schema changes (i.e. user adds new parameters)
    // We also don't handle case when streams are added or removed
    ws.on('message', (data) => {
        processMessage(streamMap, schema, data.toString());
    });
    ws.on('error', (err) => {
        console.log(`web socket error: ${err}`);
    });
    ws.on('close', () => {
        console.log('disconnected');
    });
}

function processMessage(streamMap, schema, message) {
    try {
        const data = JSON.parse(message);

        if (data.ctype === 'update_iot') {
            for (const item of data.details.update) {
                const name = streamMap.get(item.k);
                const propDef = schema.attributes.find(p => p.id === item.s);

                console.log(`${name}: ${propDef.name}`);
                for (let i = 0; i < item.v.length; i++) {
                    const value = item.v[i];
                    const ts = item.t[i];

                    console.log(`  ${new Date(ts * 1000).toLocaleString()}: ${value}`);
                }
            }
        }
    }
    catch (err) {
        console.error('failed to process message', err);
    }
}

main()
    .then(() => {
        console.log('success');
  })
    .catch((err) => {
        console.error('failure', err);
        process.exit(1);
    });
