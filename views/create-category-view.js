/*
    This example demonstrates how to create view using given category as filter. Note the result might be slighltly different
    compared to UI based workflow. In this case it uses properties of given BASE_VIEW as template.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.

    NOTE - the example uses API which is NOT DOCUMENTED at the moment:
        POST https://developer.api.autodesk.com/tandem/v1//twins/:facilityId/views
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
const BASE_VIEW_NAME = 'Home';
const CATEGORY_NAME = 'Doors';
const VIEW_LABEL = 'ASSETS';

// contains mapping between category name and internal category id
// category id is coming from Revit
const REVIT_CATEGORIES = {
    'Doors': -2000023,
    'Lighting Fixtures': -2001120,
    'Mechanical Equipment': -2001140,
    'Plumbing Fixtures': -2001160,
    'Walls': -2000011,
    'Windows': -2000014
};

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
    // STEP 3 - find base view and category id
    const baseView = views.find((v) => v.viewName === BASE_VIEW_NAME);

    if (!baseView) {
        throw new Error('Base view not found');
    }
    // find category id based on name
    const categoryId = REVIT_CATEGORIES[CATEGORY_NAME];

    if (!categoryId) {
        throw new Error(`Category id not found for category: ${CATEGORY_NAME}`);
    }
    // STEP 4 - create input for new view
    const newView = {
        author: baseView.author,
        camera: baseView.camera,
        charts: baseView.charts,
        createTime: new Date().toISOString(),
        cutPlanes: baseView.cutPlanes,
        facets: {
            filters: {
                cats: [ categoryId ],
                models: [],
            },
            isFloorplanEnabled: false,
            settings: [
                { id: 'models' },
                { id: 'levels' },
                { id: 'spaces' },
                { id: 'classifications' },
                { id: 'mepSystems' },
                { id: 'systems' },
                { id: 'cats' }
            ]
        },
        heatmap: baseView.heatmap,
        hiddenElements: baseView.hiddenElements,
        hud: {},
        inventory: baseView.inventory,
        label: VIEW_LABEL,
        version: 2,
        viewName: CATEGORY_NAME
    };

    // STEP 5 - add models to the new view
    for (const l of facility.links) {
        newView.facets.filters.models.push(l.modelId);
    }
    // STEP 6 - create new view
    const newViewResult = await client.createView(facilityId, newView);

    console.log(`new view: ${newViewResult.id}`);
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

