import * as fs from 'node:fs';
import { Readable, Transform } from 'stream';
import { finished } from 'stream/promises';
import StreamArray from 'stream-json/streamers/StreamArray.js';

import {
    ColumnFamilies,
    ColumnNames,
    ElementFlags,
    Environment,
    MutateActions,
    QC,
    Region
} from './constants.js';

const paths = {
    'prod': {
        app: 'https://tandem.autodesk.com',
        base: 'https://developer.api.autodesk.com/tandem/v1',
        cdn: 'https://static.tandem.autodesk.com'
    },
    'stg': {
        app: 'https://tandem-stg.autodesk.com',
        base: 'https://tandem-stg.autodesk.com/api/v1',
        cdn: 'https://static.tandem.autodesk.com'
    }
};

/**
 * Simple wrapper for Tandem REST API
 */
export class TandemClient {

    /**
     * The callback provides valid authentication token
     *
     * @callback authCallback
     * @returns {string}
     */

    /**
     * Class constructor. It accepts function which returns valid authentication token.
     * 
     * @param {authCallback} authProvider
     * @param {"US"|"EMEA"|"AUS"} [region=Region.US] - data storage location. Must be one of {@link Region} values.
     * @param {"prod"|"stg"} [env=Environment.Production] - environment. Must be one of {@link Environment} values.
     */
    constructor(authProvider, region = Region.US, env = Environment.Production) {
        this._version = '1.0.773';
        this._appBasePath = paths[env].app;
        this._appPath = `${this._appBasePath}/app`;
        this._basePath = paths[env].base;
        this._cdnPath = `${paths[env].cdn}/${this._version}`;
        this._clientPath = `${this._appBasePath}/client/viewer/${this._version}`;
        this._otgPath = `${this._appBasePath}/otg`;
        this._authProvider = authProvider;
        this._region = region;
    }

    get appBasePath() {
        return this._appBasePath;
    }

    get appPath() {
        return this._appPath;
    }

    get basePath() {
        return this._basePath;
    }

    get cdnPath() {
        return this._cdnPath;
    }

    get clientPath() {
        return this._clientPath;
    }

    get otgPath() {
        return this._otgPath;
    }

    get region() {
        return this._region;
    }

    set region(value) {
        this._region = value;
    }

    /**
     * Applies template to facility.
     * 
     * @param {string} facilityId - URN of the facility.
     * @param {object} template - input facility template.
     */
    async applyFacilityTemplate(facilityId, template) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/template`;
        
        await this._post(token, url, JSON.stringify(template));
        return;
    }

    /**
     * Checks access to the facility.
     * 
     * @param {string} facilityId - URN of the facility.
     * @returns {Promise<string | null>}
     */
    async checkFacilityAccess(facilityId) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}`, {
            method: 'HEAD',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.headers.get('x-dt-access-level');
    }

    /**
     * Clones given facility.
     * 
     * @param {string} groupId 
     * @param {string} facilityId 
     * @param {boolean} [skipStreamsData]
     * @returns {Promise<object>}
     */
    async cloneFacility(groupId, facilityId, skipStreamsData = false) {
        const token = this._authProvider();
        const input = {
            clone: {
                fromTwinUrn: facilityId,
                skipStreamsData: skipStreamsData
            }
        };
        const url = `${this.basePath}/groups/${groupId}/clonetwin`;
        const data = await this._post(token, url, JSON.stringify(input));

        return data;
    }

    /**
     * Completes document upload. The file should be already uploaded to S3 using link provided
     * by (@link uploadDocument} method.
     * 
     * @param {string} facilityId 
     * @param {object} inputs 
     * @returns {Promise}
     */
    async confirmDocumentUpload(facilityId, inputs) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/documents/confirmupload`;
        
        await this._post(token, url, JSON.stringify(inputs));
        return;
    }

    /**
     * Creates link to upload file.
     * 
     * @param {string} facilityId 
     * @param {object} inputs 
     * @returns {Promise}
     */
    async confirmUpload(facilityId, inputs) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/confirmupload`;
        
        await this._post(token, url, JSON.stringify(inputs));
        return;
    }

    /**
     * Adds default model to the facility.
     * 
     * @param {string} facilityId - URN of the facility.
     * @param {object} inputs 
     * @returns {Promise}
     */
    async createDefaultModel(facilityId, inputs) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/defaultmodel`;
        const data = await this._post(token, url, JSON.stringify(inputs));

        return data;
    }

    /**
     * Adds documents to the facility.
     * 
     * @param {string} facilityId 
     * @param {object[]} inputs 
     * @returns {Promise<object>} 
     */
    async createDocuments(facilityId, inputs) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/documents`;
        const data = await this._post(token, url, JSON.stringify(inputs));

        return data;
    }

    /**
     * Adds new element to the model.
     * 
     * @param {string} modelId - URN of the model.
     * @param {object} inputs
     * @returns {Promise}
     */
    async createElement(modelId, inputs) {
        const token = this._authProvider();
        const url = `${this.basePath}/modeldata/${modelId}/create`;
        const data = await this._post(token, url, JSON.stringify(inputs));

        return data;
    }

    /**
     * @typedef {Object} TwinSettingsProps
     * @property {{ key: string, value: Object }} props
     */

    /**
     * @typedef {Object} TwinSettings
     * @property {TwinSettingsProps} props
     */

    /**
     * @typedef {Object} TwinCreateInfo
     * @property {TwinSettings} settings
     */

    /**
     * Creates new facility.
     * 
     * @param {string} groupId - URN of the group. 
     * @param {TwinCreateInfo} inputs 
     * @returns {Promise<object>} 
     */
    async createFacility(groupId, inputs) {
        const token = this._authProvider();
        const url = `${this.basePath}/groups/${groupId}/twins`;
        const data = await this._post(token, url, JSON.stringify(inputs));

        return data;
    }

    /**
     * Adds new model to the facility.
     * 
     * @param {string} facilityId - URN of the facility.
     * @param {object} inputs 
     * @returns {Promise<object>}
     */
    async createModel(facilityId, inputs) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/model`;
        const data = await this._post(token, url, JSON.stringify(inputs));

        return data;
    }

    /**
     * Creates new stream using provided data
     * 
     * @param {string} urn - URN of the model
     * @param {string} name - Name of the stream
     * @param {string} uniformatClass 
     * @param {number} categoryId 
     * @param {string} [classification]
     * @param {string} [tandemCategory]
     * @param {string} [parentXref]
     * @param {string} [roomXref]
     * @param {string} [levelKey]
     * @returns {Promise}
     */
    async createStream(urn, name, uniformatClass, categoryId, classification = undefined, tandemCategory = undefined, parentXref = undefined, roomXref = undefined, levelKey = undefined) {
        const token = this._authProvider();
        const inputs = {
            muts: [
                [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Name, name ],
                [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.ElementFlags, ElementFlags.Stream ], // this flag identifies stream
                [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.UniformatClass, uniformatClass ],
                [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.CategoryId, categoryId ],

            ],
            desc: 'Create stream'
        };

        if (classification) {
            inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Classification, classification ]);
        }
        if (tandemCategory) {
            inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.TandemCategory, tandemCategory ]);
        }
        if (parentXref) {
            inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, parentXref ]);
        }
        if (roomXref) {
            inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Rooms, roomXref ]);
        }
        if (levelKey) {
            inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Refs, ColumnNames.Level, levelKey ]);
        }
        const url = `${this.basePath}/modeldata/${urn}/create`;
        const data = await this._post(token, url, JSON.stringify(inputs));

        return data.key;
    }

    /**
     * Creates link to upload file.
     * 
     * @param {string} facilityId 
     * @param {string} fileName 
     * @returns {Promise<object>}
     */
    async createUploadLink(facilityId, fileName) {
        const token = this._authProvider();
        const inputs = {
            realFileName: fileName
        };
        const url = `${this.basePath}/twins/${facilityId}/s3uploadlink`;
        const data = await this._post(token, url, JSON.stringify(inputs));

        return data;
    }

    /**
     * Creates saved view based on provided input.
     * 
     * @param {string} facilityId 
     * @param {any} view 
     * @returns {Promise<any>}
     */
    async createView(facilityId, view) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/views`;
        const data = await this._post(token, url, JSON.stringify(view));

        return data;
    }

    /**
     * Deletes given elements from the model.
     * 
     * @param {string} modelId - urn of the model.
     * @param {string[]} keys - element keys to delete.
     * @param {string} desc - description of the operation.
     * @returns {Promise<object>}
     */
    async deleteElements(modelId, keys, desc) {
        const mutations = [];

        Array(keys.length).fill([ MutateActions.DeleteRow, '', '', '']);
        const result = await this.mutateElements(modelId, keys, mutations, desc);

        return result;
    }

    /**
     * Deletes stream data from given keys.
     * 
     * @param {string} modelId - urn of the model which owns the streams.
     * @param {string[]} keys - stream keys (fully qualified).
     * @param {string[]} [substreams] - optional array of parameter ids to delete their value. if not provided all stream data will be deleted.
     * @param {string} [from] - optional lower time boundary (yyyy-MM-dd)
     * @param {string} [to] - optional upper time boundary (yyyy-MM-dd)
     * @returns {Promise<void>}
     */
    async deleteStreamsData(modelId, keys, substreams = undefined, from = undefined, to = undefined) {
        const token = this._authProvider();
        const inputs = {
            keys: keys
        };
        const queryParams = new URLSearchParams();

        if (substreams) {
            queryParams.append('substreams', `${substreams.join(',')}`);
        }
        if (from) {
            queryParams.append('from', `${from}`);
        }
        if (to) {
            queryParams.append('to', `${to}`);
        }
        // if there are no input parameters, then delete all stream data
        if (!queryParams.has('substreams')) {
            queryParams.append('allSubstreams', '1');
        }
        let url = `${this.basePath}/timeseries/models/${modelId}/deletestreamsdata`;

        if (queryParams.size > 0) {
            url += `?${queryParams}`;
        }
        await this._post(token, url, JSON.stringify(inputs));
    }

    /**
     * Returns stored classifications.
     * 
     * @returns {Promise<object[]>}
     */
    async getClassifications() {
        const token = this._authProvider();
        const response = await fetch(`${this.clientPath}/classifications.json`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns details for given document.
     * 
     * @param {string} facilityId - URN of the facility.
     * @param {string} documentId - URN of the document.
     * @returns {Promise<object>}
     */
    async getDocument(facilityId, documentId) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/documents/${documentId}`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns single element from given model.
     * 
     * @param {string} urn - URN of the model.
     * @param {string} key - key of the element. 
     * @param {string[]} [columnFamilies] - optional array of column families.
     * @param {boolean} [includeHistory] - controls if history is included.
     * @returns {Promise<object[]>}
     */
    async getElement(urn, key, columnFamilies = [ ColumnFamilies.Standard ], includeHistory = false) {
        const data = await this.getElements(urn, [ key ] , columnFamilies, undefined, includeHistory);
    
        return data[0];
    }

    /**
     * Returns elements from given model.
     * 
     * @param {string} urn - URN of the model.
     * @param {string[]} [keys] - optional array of keys. 
     * @param {string[]} [columnFamilies] - optional array of column families.
     * @param {string[]} [columns] - optional array of qualified columns.
     * @param {boolean} [includeHistory] - controls if history is included.
     * @returns {Promise<object[]>}
     */
    async getElements(urn, keys = undefined, columnFamilies = [ ColumnFamilies.Standard ], columns = undefined, includeHistory = false) {
        const token = this._authProvider();
        const inputs = {
            includeHistory: includeHistory,
            skipArrays: true
        };

        if (columnFamilies && columnFamilies.length > 0) {
            inputs.families = columnFamilies;
        }
        if (columns && columns.length > 0) {
            inputs.qualifiedColumns = columns;
        }
        if (keys && keys.length > 0) {
            inputs.keys = keys;
        }
        const url = `${this.basePath}/modeldata/${urn}/scan`;
        const data = await this._post(token, url, JSON.stringify(inputs));
    
        return data.slice(1);
    }

    /**
     * Reads elements from model using streaming.
     * 
     * @param {string} modelId - URN of the model.
     * @param {string[]} [columnFamilies] - optional array of column families.
     * @yields {Promise<object>} - async iterator of elements.
     */
    async *getElementStream(modelId, columnFamilies = [ ColumnFamilies.Standard ]) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };

        const url = `${this.basePath}/modeldata/${modelId}/scan`;
        const headers = {
            'Authorization': `Bearer ${token}`
        };

        if (this._region) {
            headers['Region'] = this._region;
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(inputs)
        });
        const elementStream = Readable.fromWeb(response.body).pipe(StreamArray.withParser()).pipe(new ElementFilter());

        yield* elementStream;
    }

    /**
     * Returns facility based on given URN.
     * 
     * @param {string} facilityId - URN of the facility
     * @returns {Promise<object>}
     */
    async getFacility(facilityId) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns facility template based on facility URN.
     * 
     * @param {string} facilityId - URN of the facility
     * @returns {Promise<object>}
     */
    async getFacilityTemplate(facilityId) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/inlinetemplate`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns stored facility templates.
     * 
     * @returns {Promise<object[]>}
     */
    async getFacilityTemplates() {
        const token = this._authProvider();
        const response = await fetch(`${this.clientPath}/facilityTemplates.json`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        return data;
    }

    /**
     * Returns dictionary of facility users.
     * 
     * @param {string} facilityId 
     * @returns {Promise<Object.<string, object>>}
     */
    async getFacilityUsers(facilityId) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/users`;
        const data = await this._get(token, url);
        
        return data;
    }

    /**
     * Returns group details.
     * 
     * @param {string} groupId - URN of the group.
     * @returns {Promise<Object.<string, object>>}
     */
    async getGroup(groupId) {
        const token = this._authProvider();
        const url = `${this.basePath}/groups/${groupId}`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns list of facilities for given group.
     * 
     * @param {string} groupId - URN of the group.
     * @returns {Promise<object>}
     */
    async getGroupFacilities(groupId) {
        const token = this._authProvider();
        const url = `${this.basePath}/groups/${groupId}/twins`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns list of groups.
     * 
     * @returns {Promise<object[]>}
     */
    async getGroups() {
        const token = this._authProvider();
        const url = `${this.basePath}/groups`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns level elements from given model.
     * 
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of columns
     * @returns {Promise<object[]>}
     */
    async getLevels(urn, columnFamilies = [ ColumnFamilies.Standard ]) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };
        const url = `${this.basePath}/modeldata/${urn}/scan`;
        const data = await this._post(token, url, JSON.stringify(inputs));
        const results = [];

        for (const item of data) {
            if (item[QC.ElementFlags] === ElementFlags.Level) {
                results.push(item);
            }
        }
        return results;
    }

    /**
     * Returns manifest for given URN.
     * 
     * @param {string} urn - URN of the document.
     * @returns {Promise<object>}
     */
    async getManifest(urn) {
        const token = this._authProvider();
        const response = await fetch(`${this.otgPath}/modeldata/manifest/${urn}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns metadata of the model.
     * 
     * @param {string} modelId - URN of the model
     * @returns {Promise<object>}
     */
    async getModel(modelId) {
        const token = this._authProvider();
        const url = `${this.basePath}/modeldata/${modelId}/model`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns model attributes.
     * 
     * @param {string} modelId 
     * @returns {any}
     */
    async getModelAttributes(modelId) {
        const token = this._authProvider();
        const url = `${this.basePath}/modeldata/${modelId}/attrs`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns model changes.
     * 
     * @param {string} modelId - URN of the model.
     * @param {number[]} timestamps - array of timestamps.
     * @param {boolean} [includeChanges] - include change details.
     * @param {boolean} [useFullKeys] - include full keys. Used only if includeChanges = true.
     * @returns {Promise<object[]>}
     */
    async getModelHistory(modelId, timestamps, includeChanges = false, useFullKeys = false) {
        const token = this._authProvider();
        const inputs = {
            timestamps: timestamps,
            includeChanges: includeChanges,
            useFullKeys: useFullKeys
        };

        const url = `${this.basePath}/modeldata/${modelId}/history`;
        const data = await this._post(token, url, JSON.stringify(inputs));

        return data;
    }

    /**
     * Returns model changes.
     * 
     * @param {string} modelId - URN of the model.
     * @param {number} from - timestamp of start date.
     * @param {number} to - timestamp of end date.
     * @param {boolean} [includeChanges] - include change details.
     * @param {boolean} [useFullKeys] - include full keys. Used only if includeChanges = true.
     * @returns {Promise<object[]>}
     */
    async getModelHistoryBetweenDates(modelId, from, to, includeChanges = true, useFullKeys = true) {
        const token = this._authProvider();
        const inputs = {
            min: from,
            max: to,
            includeChanges: includeChanges,
            useFullKeys: useFullKeys
        };
        const url = `${this.basePath}/modeldata/${modelId}/history`;
        const data = await this._post(token, url, JSON.stringify(inputs));

        return data;
    }

    /**
     * Returns model properties including status.
     * 
     * @param {string} modelId - URN of the model
     * @returns {Promise<object>}
     */
    async getModelProps(modelId) {
        const token = this._authProvider();
        const url = `${this.basePath}/models/${modelId}/props`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns schema of the model.
     * 
     * @param {string} modelId - URN of the model
     * @returns {Promise<object>}
     */
    async getModelSchema(modelId) {
        const token = this._authProvider();
        const url = `${this.basePath}/modeldata/${modelId}/schema`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns stored parameters.
     * 
     * @returns {Promise<object[]>}
     */
    async getParameters() {
        const token = this._authProvider();
        const response = await fetch(`${this.clientPath}/parameters.json`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        return data;
    }

    /**
     * Returns room elements from given model.
     * 
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of columns
     * @returns {Promise<object[]>}
     */
    async getRooms(urn, columnFamilies = [ ColumnFamilies.Standard ]) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };
        const url = `${this.basePath}/modeldata/${urn}/scan`;
        const data = await this._post(token, url, JSON.stringify(inputs));
        const results = [];

        for (const item of data) {
            if (item[QC.ElementFlags] === ElementFlags.Room) {
                results.push(item);
            }
        }
        return results;
    }

    /**
     * Returns stream data.
     * 
     * @param {string} urn - URN of the model.
     * @param {string} streamKey - full key of the stream. 
     * @param {number} [from] - lower time boundary (in Unix epoch).
     * @param {number} [to] - upper time boundary (in Unix epoch).
     * @param {number} [limit] - number of entries to return.
     * @param {"asc"|"desc"} [sort] - sort order.
     * @returns {Promise<object>}
     */
    async getStreamData(urn, streamKey, from, to, limit, sort) {
        const queryParams = new URLSearchParams();

        if (from) {
            queryParams.append('from', `${from}`);
        }
        if (to) {
            queryParams.append('to', `${to}`);
        }
        if (limit) {
            queryParams.append('limit', `${limit}`);
        }
        if (sort) {
            queryParams.append('sort', `${sort}`);
        }
        const token = this._authProvider();
        let url = `${this.basePath}/timeseries/models/${urn}/streams/${streamKey}`;
        
        if (queryParams.size > 0) {
            url += `?${queryParams}`;
        }
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns last stream readings.
     * 
     * @param {string} urn - URN of the model.
     * @param {string[]} keys - list of stream kes. 
     * @returns {Promise<{Object.<string, any>}>}
     */
    async getStreamLastReading(urn, keys) {
        const inputs = {
            keys
        };
        const token = this._authProvider();
        const url = `${this.basePath}/timeseries/models/${urn}/streams`;
        const data = await this._post(token, url, JSON.stringify(inputs));

        return data;
    }

        /**
         * Returns stream elements from given model.
         * 
         * @param {string} urn - URN of the model.
         * @param {string[]} [columnFamilies] - optional list of column families
         * @param {string[]} [columns] - optional list of columns
         * @returns {Promise<any[]>}
         */
        async getStreams(urn, columnFamilies = [ ColumnFamilies.Standard ], columns = undefined) {
            const token = this._authProvider();
            const inputs = {
                includeHistory: false,
                skipArrays: true
            };

            if (columnFamilies && columnFamilies.length > 0) {
                inputs.families = columnFamilies;
            }
            if (columns && columns.length > 0) {
                inputs.qualifiedColumns = columns;
            }
            const url = `${this.basePath}/modeldata/${urn}/scan`;
            const data = await this._post(token, url, JSON.stringify(inputs));
            const results = [];

            for (const item of data) {
                if (item[QC.ElementFlags] === ElementFlags.Stream) {
                    results.push(item);
                }
            }
            return results;
        }

    /**
     * Returns secrets for streams.
     * 
     * @param {string} urn - the URN of the facility.
     * @param {string[]} keys - list of stream keys to query.
     * @returns {Promise<object>}
     */
    async getStreamsSecrets(urn, keys) {
        const token = this._authProvider();
        const inputs = {
            keys: keys
        };
        const url = `${this.basePath}/models/${urn}/getstreamssecrets`;
        const data = await this._post(token, url, JSON.stringify(inputs));
        
        return data;
    }

    /**
     * Returns system elements from given model.
     * 
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of columns
     * @returns {Promise<object[]>}
     */
    async getSystems(urn, columnFamilies = [ ColumnFamilies.Standard, ColumnFamilies.Refs, ColumnFamilies.Systems ]) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };
        const url = `${this.basePath}/modeldata/${urn}/scan`;
        const data = await this._post(token, url, JSON.stringify(inputs));
        const results = [];

        for (const item of data) {
            if (item[QC.ElementFlags] === ElementFlags.System) {
                results.push(item);
            }
        }
        return results;
    }

    /**
     * Returns asset elements from given model. Tagged asset is element with custom properties ('z' family).
     * 
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of columns
     * @param {boolean} [includeHistory] - controls if history information is included in response
     * @returns {Promise<object[]>}
     */
    async getTaggedAssets(urn, columnFamilies = [ ColumnFamilies.Standard, ColumnFamilies.DtProperties, ColumnFamilies.Refs ], includeHistory = false) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: includeHistory,
            skipArrays: true
        };
        const url = `${this.basePath}/modeldata/${urn}/scan`;
        const data = await this._post(token, url, JSON.stringify(inputs));
        const results = [];

        for (const item of data) {
            const keys = Object.keys(item);
            const userProps = keys.filter(k => k.startsWith(`${ColumnFamilies.DtProperties}:`));

            if (userProps.length > 0) {
                results.push(item);
            }
        }
        return results;
    }

    /**
     * Returns the list of Tandem categories.
     * 
     * @returns {Promise<any>}
     */
    async getTandemCategories() {
        const url = `${this.cdnPath}/tandem_categories.json`;
        const response = await fetch(url, {
            method: 'GET'
        });

        if (response.status !== 200) {
            throw new Error(`Error calling Tandem API: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * Returns ticket elements from given model.
     * 
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of column families
     * @param {string[]} [columns] - optional list of columns
     * @returns {Promise<any[]>}
     */
    async getTickets(urn, columnFamilies = [ ColumnFamilies.Standard, ColumnFamilies.Xrefs ], columns = undefined) {
        const token = this._authProvider();
        const inputs = {
            includeHistory: false,
            skipArrays: true
        };

        if (columnFamilies && columnFamilies.length > 0) {
            inputs.families = columnFamilies;
        }
        if (columns && columns.length > 0) {
            inputs.qualifiedColumns = columns;
        }
        const url = `${this.basePath}/modeldata/${urn}/scan`;
        const data = await this._post(token, url, JSON.stringify(inputs));
        const results = [];

        for (const item of data) {
            if (item[QC.ElementFlags] === ElementFlags.Ticket) {
                results.push(item);
            }
        }
        return results;
    }

    /**
     * Returns map of user facilities.
     * 
     * @param {string} userId 
     * @returns {Promise<Object.<string, object>>}
     */
    async getUserFacilities(userId = '@me') {
        const token = this._authProvider();
        const url = `${this.basePath}/users/${userId}/twins`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns list of user resources (groups and facilities).
     * 
     * @param {"@me"} userId 
     * @returns {Promise<object>}
     */
    async getUserResources(userId = '@me') {
        const token = this._authProvider();
        const url = `${this.basePath}/users/${userId}/resources`;
        const data = await this._get(token, url);

        return data;
    }

    /**
     * Returns saved facility views.
     * 
     * @param {string} urn - URN of the facility.
     * @returns {Promise<object[]>} - array of views.
     */
    async getViews(urn) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${urn}/views`;
        const data = await this._get(token, url);
        
        return data;
    }

    /**
     * Imports model for given facility. The model must be created using {@link createModel} function.
     * 
     * @param {string} facilityId 
     * @param {object} inputs
     * @returns {Promise} 
     */
    async importModel(facilityId, inputs) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/import`;
        
        await this._post(token, url, JSON.stringify(inputs));
    }

    /**
     * Applies provided changes (mutations) to the elements.
     * 
     * @param {string} urn - URN of the model.
     * @param {string[]} keys - array of keys to modify.
     * @param {any[][]} mutations - arry of mutations.
     * @param {string} [description] - optional description.
     * @param {string} [correlationId] - optional correlation ID. Useful for cases when a change spans across multiple mutation calls (e.g. multi-model operations).
     * @returns {Promise<any>}
     */
    async mutateElements(urn, keys, mutations, description = undefined, correlationId = undefined) {
        const token = this._authProvider();
        const inputs = {
            keys,
            muts: mutations
        };

        if (description) {
            inputs.desc = description;
        }
        if (correlationId) {
            inputs.correlationId = correlationId;
        }
        const url = `${this.basePath}/modeldata/${urn}/mutate`;
        const result = await this._post(token, url, JSON.stringify(inputs));
        
        return result;
    }

    /**
     * Resets secrets for given streams.
     * 
     * @param {string} urn 
     * @param {string[]} streamIds 
     * @param {boolean} [hardReset]
     * @returns {Promise<object}
     */
    async resetStreamsSecrets(urn, streamIds, hardReset) {
        const token = this._authProvider();
        const inputs = {
            keys: streamIds,
            hardReset: hardReset ? true : false
        };
        const url = `${this.basePath}/models/${urn}/resetstreamssecrets`;
        const result = await this._post(token, url, JSON.stringify(inputs));

        return result;
    }

    /**
     * Saves document content to file.
     * 
     * @param {string} url 
     * @param {string} fileName
     * @returns {Promise} 
     */
    async saveDocumentContent(url, fileName) {
        const token = this._authProvider();
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    
        if (res.status !== 200) {
            return;
        }
        const stream = fs.createWriteStream(fileName);
    
        await finished(Readable.fromWeb(res.body).pipe(stream));
    }

    /**
     * Saves document content to file.
     * 
     * @param {string} urn
     * @param {string} streamKey
     * @param {any} data
     * @returns {Promise} 
     */
    async sendStreamData(urn, streamKey, data) {
        const token = this._authProvider();
        const url = `${this.basePath}/timeseries/models/${urn}/streams/${streamKey}`;
        
        await this._post(token, url, JSON.stringify(data));
    }

    /**
     * Updates facility based on provided inputs.
     * 
     * @param {string} facilityId - URN of the facility
     * @param {object} facilityData - facility data
     * @param {string} etag - last modification time
     * @returns {Promise<object>}
     */
    async updateFacility(facilityId, facilityData, etag) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}`;
        
        const data = await this._put(token, url, facilityData, {
            'Etag': etag
        });
        return data;
    }

    /**
     * Starts document upload process.
     * 
     * @param {string} facilityId 
     * @param {object} fileInput 
     * @returns {Promise<object>}
     */
    async uploadDocument(facilityId, fileInput) {
        const token = this._authProvider();
        const url = `${this.basePath}/twins/${facilityId}/documents/upload`;
        const data = await this._post(token, url, JSON.stringify(fileInput));

        return data;
    }

    async _get(token, url, additionalHeaders = {}) {
        const headers = {
            'Authorization': `Bearer ${token}`,
            ...additionalHeaders
        };

        if (this._region) {
            headers['Region'] = this._region;
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        if (response.status !== 200) {
            throw new Error(`Error calling Tandem API: ${response.status}`);
        }
        const data = await response.json();

        return data;
    }

    async _post(token, url, body, additionalHeaders = {}) {
        const headers = {
            'Authorization': `Bearer ${token}`,
            ...additionalHeaders
        };

        if (this._region) {
            headers['Region'] = this._region;
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (response.status === 202 || response.status === 204) {
            return;
        }
        if (response.status !== 200) {
            const details = await response.text();

            throw new Error(`Error calling Tandem API: ${response.status} (${details})`);
        }
        const data = await response.json();

        return data;
    }

    async _put(token, url, body, additionalHeaders = {}) {
        const headers = {
            'Authorization': `Bearer ${token}`,
            ...additionalHeaders
        };

        if (this._region) {
            headers['Region'] = this._region;
        }
        const response = await fetch(url, {
            method: 'PUT',
            headers: headers,
            body: body
        });

        if (response.status === 202 || response.status === 202) {
            return;
        }
        if (response.status !== 200) {
            throw new Error(`Error calling Tandem API: ${response.status}`);
        }
        const data = await response.json();

        return data;
    }
}

class ElementFilter extends Transform {
    constructor(elementFlags) {
        super({ objectMode: true });
        this._elementFlags = elementFlags;
    }

    _transform(chunk, encoding, callback) {
        if (chunk.value?.[QC.Key]) {
            if (this._elementFlags === undefined) {
                this.push(chunk.value);
            }
            if ((this._elementFlags !== undefined) && (chunk.value[QC.ElementFlags] === this._elementFlags)) {
                this.push(chunk.value);
            }
        }
        callback();
    }
}
