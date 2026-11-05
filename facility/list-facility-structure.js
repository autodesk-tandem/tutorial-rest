/*
    This example demonstrates how to list structure of the facility (level - room - asset)
    
    It uses 2-legged authentication - this requires that application is added to the account as service.
*/
import * as fs from 'fs';
import { createToken } from '../common/auth.js';
import { ColumnFamilies, QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { Encoding, getDefaultModel, isLevel, isRoom } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read');
    const client = new TandemClient(() => {
        return token;
    });

    // STEP 2 - get facility
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    // this structure is used to keep structure data. it uses element keys as keys for maps.
    const data = {
        levels: new Map(), // map between level key and level
        rooms: new Map(), // map between room key and room
        assets: new Map(), // map between asset key and asset
        locationAssetsMap: new Map(), // map between location and assets (location key - asset keys)
        roomLevelMap: new Map() // map between room and level (room key - level key)
    };
    // STEP 3 - collect assets and read related location references
    const assets = await client.getTaggedAssets(defaultModel.modelId);
    const locationIds = new Set();

    for (const asset of assets) {
        const assetKey = asset[QC.Key];

        data.assets.set(assetKey, asset);
        // STEP 4 - find location references
        const locationId = asset[QC.OLocation] ?? asset[QC.Location];

        if (!locationId) {
            continue;
        }
        // STEP 5 - decode location IDs and update location-assets map
        const [ _, elementIds ] = Encoding.fromXrefKeyArray(locationId);

        locationIds.add(...elementIds);
        for (const elementId of elementIds) {
            if (!data.locationAssetsMap.has(elementId)) {
                data.locationAssetsMap.set(elementId, new Set());
            }
            data.locationAssetsMap.get(elementId).add(assetKey);
        }
    }
    // STEP 6 - fetch locations
    const locations = await client.getElements(defaultModel.modelId, Array.from(locationIds),
        [ ColumnFamilies.Standard, ColumnFamilies.Refs ]);
    const levelIds = new Set();

    for (const location of locations) {
        const locationKey = location[QC.Key];

        // STEP 7 - categorize locations into levels and rooms
        if (isLevel(location)) {
            data.levels.set(locationKey, location);
        }
        if (isRoom(location)) {
            data.rooms.set(locationKey, location);
            // STEP 8 - collect parent level references for rooms
            const parentLevelRef = location[QC.Parent];

            if (parentLevelRef) {
                levelIds.add(parentLevelRef);
                data.roomLevelMap.set(locationKey, parentLevelRef);
            }
        }
    }
    // STEP 9 - fetch levels
    const levels = await client.getElements(defaultModel.modelId, Array.from(levelIds),
        [ ColumnFamilies.Standard, ColumnFamilies.Refs ]);

    for (const level of levels) {
        const levelKey = level[QC.Key];

        data.levels.set(levelKey, level);
    }
    // STEP 10 - iterate through structure
    console.debug(`facility data list`);
    for (const level of getLevels(data)) {
        const levelName = level[QC.OName] ?? level[QC.Name];

        console.debug(`[L] ${levelName}`);
        for (const room of getRoomsByLevel(data, level[QC.Key])) {
            const roomName = room[QC.OName] ?? room[QC.Name];

            console.debug(`  [R] ${roomName}`);
            for (const asset of getAssetsByLocation(data, room[QC.Key])) {
                const assetName = asset[QC.OName] ?? asset[QC.Name];

                console.debug(`    [A] ${assetName}`);
            }
        }
        for (const asset of getAssetsByLocation(data, level[QC.Key])) {
            const assetName = asset[QC.OName] ?? asset[QC.Name];

            console.debug(`    [A] ${assetName}`);
        }
    }
    // STEP 11 - save structure to file
    await saveToFile(data, 'facility-structure.json');
}

/**
 * Get all levels from the facility data.
 * 
 * @param {any} data 
 * @returns {Array<any>}
 */
function getLevels(data) {
    return data.levels.entries().map(l => l[1]);
}

/**
 * Get all rooms for a specific level from the facility data.
 * 
 * @param {any} data 
 * @param {string} levelKey 
 * @returns {Array<any>}
 */
function getRoomsByLevel(data, levelKey) {
    const result = [];

    for (const [ key, room ] of data.rooms.entries()) {
        if (data.roomLevelMap.get(key) !== levelKey) {
            continue;
        }
        result.push(room);
    }
    return result;
}

/**
 * Get all assets for a specific location from the facility data.
 * 
 * @param {any} data 
 * @param {string} locationKey 
 * @returns {Array<any>}
 */
function getAssetsByLocation(data, locationKey) {
    const assetKeys = data.locationAssetsMap.get(locationKey);
    const result = [];

    for (const assetKey of assetKeys) {
        const asset = data.assets.get(assetKey);

        result.push(asset);
    }
    return result;
}

/**
 * Save object to JSON file.
 * 
 * @param {any} data 
 * @param {string} fileName 
 * @returns {Promise<void>}
 */
function saveToFile(data, fileName) {
    return new Promise((resolve, reject) => {
        fs.writeFile(fileName, JSON.stringify(data, (key, value) => {
            if (value instanceof Map) {
                return Array.from(value.entries());
            }
            if (value instanceof Set) {
                return Array.from(value);
            }
            return value;
        }), err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
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
