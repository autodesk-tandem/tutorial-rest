/*
    This example demonstrates how to create views for each level in the facility.
    In this case it uses properties of given BASE_VIEW as template.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
// name of the view to use as template
const BASE_VIEW_NAME = 'Home';
// group label for created views
const VIEW_LABEL = 'LEVELS';

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });
    
    // STEP 2 - get facility & views
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const views = await client.getViews(facilityId);
    // STEP 3 - find base view
    const baseView = views.find((v) => v.viewName === BASE_VIEW_NAME);

    if (!baseView) {
        throw new Error('Base view not found');
    }
    // STEP 4 - find main model
    const mainModel = facility.links.find(link => link.main);

    if (!mainModel) {
        throw new Error(`Main model not found`);
    }
    // STEP 5 - get levels
    const levels = await client.getLevels(mainModel.modelId);

    for (const level of levels) {
        // STEP 6 - create input for new view
        const name = level[QC.OName] ?? level[QC.Name];
        const newView = {
            author: baseView.author,
            camera: baseView.camera,
            charts: baseView.charts,
            createTime: new Date().toISOString(),
            cutPlanes: baseView.cutPlanes,
            facets: {
                filters: {
                    models: baseView.facets.filters.models,
                    levels: [ name ]
                },
                settings: [
                    { id: 'models' },
                    { id: 'levels' },
                    { id: 'spaces' },
                    { id: 'classifications' },
                    { id: 'tandemCategories' },
                    { id: 'cats' }
                ]
            },
            heatmap: baseView.heatmap,
            hiddenElements: baseView.hiddenElements,
            hud: baseView.hud,
            inventory: baseView.inventory,
            label: VIEW_LABEL,
            version: 2,
            viewName: name
        };
        // STEP 7 - create new view
        const newViewResult = await client.createView(facilityId, newView);

        console.log(`new view: ${name} (${newViewResult.id})`);
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

