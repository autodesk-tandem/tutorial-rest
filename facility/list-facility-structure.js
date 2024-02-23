/*
    This example demonstrates how to list structure of the facility (level - room - asset)
    
    It uses 2-legged authentication - this requires that application is added to the account as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, Encoding, QC } from '../common/utils.js';

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

    // STEP 2 - get facility & facility template
    const facility = await client.getFacility(FACILITY_URN);
    // this structure is used to keep structure data. it uses element keys as keys for maps.
    const data = {
        levels: {}, // map between level key and level
        rooms: {}, // map between room key and room
        assets: {}, // map between asset key and asset
        roomAssetsMap: {}, // map between room and assets (asset key - room key)
        roomLevelMap: {} // map between room and level (room key - level key)
    };
    const modelRooms = [];

    // STEP 3 - collect assets and related room references
    for (const link of facility.links) {
        // skip default model
        if (isDefaultModel(FACILITY_URN, link.modelId)) {
            continue;
        }
        const assets = await client.getTaggedAssets(link.modelId,
            [ ColumnFamilies.Standard, ColumnFamilies.DtProperties, ColumnFamilies.Refs, ColumnFamilies.Xrefs ]);
        const modelId = link.modelId;

        for (const asset of assets) {
            // unique asset key
            const assetKey = asset[QC.Key];

            data.assets[assetKey] = asset;
            // STEP 4 - find room references. Note that reference can be within same model or across models
            let roomRef = asset[QC.Rooms];
            const assetRooms = [];

            if (roomRef) {
                const roomKeys = Encoding.fromShortKeyArray(roomRef);

                for (const roomKey of roomKeys) {
                    assetRooms.push({
                        modelId: modelId,
                        roomId: roomKey
                    });
                }
            } else {
                roomRef = asset[QC.XRooms];
                const roomKeys = Encoding.fromXrefKeyArray(roomRef);
                const modelIds = roomKeys[0];
                const elementKeys = roomKeys[1];

                for (let i = 0; i < modelIds.length; i++) {
                    assetRooms.push({
                        modelId: `urn:adsk.dtm:${modelIds[i]}`,
                        // in case of xref key we need to decode from long key to short key
                        roomId: Encoding.toShortKey(elementKeys[i])
                    });
                }
            }
            // STEP 5 - build map between asset and rooms - note that asset can be linked to more than one room
            for (const { roomId } of assetRooms) {
                const roomKey = roomId;
                let assetIds = data.roomAssetsMap[roomKey];

                if (!assetIds) {
                    assetIds = [];
                }
                assetIds.push(assetKey);
                data.roomAssetsMap[roomKey] = assetIds;
            }
            modelRooms.push(... assetRooms);
        }
    }
    // STEP 6 - process rooms and create map between room and level
    const modelIds = new Set(modelRooms.map(i => i.modelId));

    for (const modelId of modelIds) {
        const roomIds = new Set(modelRooms.filter(i => i.modelId === modelId).map(i => i.roomId));
        const rooms = await client.getElements(modelId, [... roomIds ],
            [ ColumnFamilies.Standard, ColumnFamilies.Refs ]);
        const levelIds = new Set();

        for (const room of rooms) {
            const roomKey = room[QC.Key];

            data.rooms[roomKey] = room;
            const levelRef = room[QC.Level];

            if (levelRef) {
                levelIds.add(levelRef);
                data.roomLevelMap[roomKey] = levelRef, true;
            }
        }
        // process levels
        if (levelIds.size > 0) {
            const levels = await client.getElements(modelId, [... levelIds ]);

            for (const level of levels) {
                const levelKey = level[QC.Key];

                data.levels[levelKey] = level;
            }
        }
    }
    // STEP 7 - iterate through structure
    console.debug(`facility data list`);
    for (const { levelKey, level } of getLevels(data)) {
        console.debug(`${level[QC.Name]}`);
        for (const { roomKey, room } of getRoomsByLevel(data, levelKey)) {
            console.debug(`  ${room[QC.Name]}`);
            for (const { asset } of getAssetsByRoom(data, roomKey)) {
                console.debug(`    ${asset[QC.Name]}`);
            }
        }
    }
    // STEP 8 - save structure to file
    await saveToFile(data, 'facility-structure.json');
}

/**
 * Check if model is default model.
 * 
 * @param {string} facilityId 
 * @param {string} modelId 
 * @returns {boolean}
 */
function isDefaultModel(facilityId, modelId) {
    const defaultModelId = facilityId.replace('urn:adsk.dtt:', 'urn:adsk.dtm:');

    return defaultModelId == modelId;
}

function getLevels(data) {
    const result = [];

    for (const levelKey in data.levels) {
        const level = data.levels[levelKey];

        result.push({ levelKey, level });
    }
    return result;
}

function getRoomsByLevel(data, levelKey) {
    const result = [];

    for (const roomKey in data.rooms) {
        if (data.roomLevelMap[roomKey] !== levelKey) {
            continue;
        }
        const room = data.rooms[roomKey];

        result.push({ roomKey, room });
    }
    return result;
}

function* getAssetsByRoom(data, roomKey) {
    const assetKeys = data.roomAssetsMap[roomKey];
    const result = [];

    for (const assetKey of assetKeys) {
        const asset = data.assets[assetKey];

        result.push({ assetKey, asset });
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
        fs.writeFile(fileName, JSON.stringify(data), err => {
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
