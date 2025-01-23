/*
    This example demonstrates how to update stream settings (thresholds).
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies,
    ColumnNames,
    MutateActions, 
    QC } from '../common/constants.js';
import { Encoding,
    getDefaultModel,
    matchClassification } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
const PARAMETER_NAME = 'Temperature'; // parameter name to apply threshold to

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

    if (!defaultModel) {
        throw new Error('Default model not found');
    }
    // STEP 3 - get template for facility and related parameter set
    const template = await client.getFacilityTemplate(facilityId);
    const pset = template.psets.find(p => p.name === template.name);
    // STEP 4 - get schema
    const schema = await client.getModelSchema(defaultModel.modelId);
    // STEP 5 - iterate through streams and apply threshold to streams that have parameter with name 'Temperature'
    const streams = await client.getStreams(defaultModel.modelId);
    const keys = [];
    const muts = [];

    for (const stream of streams) {
        const classificationId = stream[QC.OClassification] ?? stream[QC.Classification];
        const parameters = pset?.parameters.filter(p => p.applicationFilters.userClass.some(c => matchClassification(classificationId, c)));
        const parameter = parameters.find(p => p.name === PARAMETER_NAME);

        if (!parameter) {
            continue;
        }
        const parameterDef = schema.attributes.find(a => a.name === parameter.name);
        const parameterId = parameterDef.id;
        // STEP 6 - create stream settings for specific parameter. Note this will overwrite existing settings.
        const streamSettings = {
            thresholds: {
            }
        };

        // define threshold for specific parameter
        streamSettings.thresholds[parameterId] = {
            schema: 'v1',
            name: parameter.name,
            lower: {
                alert: 14,
                warn: 16
            },
            upper: {
                alert: 23,
                warn: 21
            }
        };
        // STEP 7 - encode stream settings and store it in list of mutations
        const settingsEnc = Encoding.encodeStreamSettings(streamSettings);

        console.log(`Applying threshold to stream: ${stream[QC.Name]}`);
        keys.push(stream[QC.Key]);
        muts.push([
            MutateActions.Insert,
            ColumnFamilies.Standard,
            ColumnNames.Settings,
            settingsEnc
        ]);
    }
    // STEP 8 - apply changes
    if (muts.length > 0) {
        await client.mutateElements(defaultModel.modelId, keys, muts, 'Update streams thresholds');
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

