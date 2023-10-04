import fetch from 'node-fetch';

/*
This example demonstrates how to send sensor readings to Tandem for individual sensor, using a dedicated per-sensor endpoint
*/

async function main() {
	/*
		STEP 1: Construct payload
		Autodesk Tandem expects payload to be a valid JSON
		in the given example we will report a sensor reading, containing air temperature and air pressure values

		NOTE: Please keep in mind that Tandem supports arbitrary payloads, so, an extra configuration step in UI is required to explan Tandem how to parse incoming payload. See https://autodesk-tandem.github.io/API_streams.html for the reference

		NOTE: by default, Tandem will use server time to associate data points with. You can supply your own time using fields ("time", "timestamp" or "epoch") on the root level of your payload. Note on supported time formats is here https://forums.autodesk.com/t5/tandem-forum/streams-highlight-supported-timestamp-formats/td-p/11989221
	 */

	// can be an array or readings as well
	const payload = {
		temperatureValue: 25,
		pressureValue: 100,
	};

	const wantToDefineMyOwnTimestamp = false;

	if (wantToDefineMyOwnTimestamp) {
		payload.timestamp = new Date().getTime();
	}

	/*
		STEP 2: Make sure auth token is provided and POST the data
		When ingesting data to individual streams, each stream has it's own secret value, that has to be provided in the HTTP call via "authorization" header

		For convinience, there is an option to copy stream ingestion URL directly from the UI - this url is fully self contained. Example url looks like this:

		https://:somesecret@tandem.autodesk.com/api/v1/timeseries/models/urn:adsk.dtm:APCMKgIDSyOFpZ763lew7Q/streams/AQAAAC6lzjQuhETds3FO9vuJy5EAAAAA

		NOTE: some HTTP clients might not respect the url shape and not set authorizaion header correctly - in these cases, you will receive 403 from the API call. To fix this, you will need to set the header manually. See following example, where code guides you though this. It shows both options, but you will have to pick one that works best for your environment
	*/

	const streamURL =
		'https://:somesecret@tandem.autodesk.com/api/v1/timeseries/models/urn:adsk.dtm:APCMKgIDSyOFpZ763lew7Q/streams/AQAAAC6lzjQuhETds3FO9vuJy5EAAAAA';

	try {
		const res = await fetch(streamURL, {
			method: 'POST',
			body: JSON.stringify(payload),
		});

		if (res.status === 403) {
			throw new Error('forbidden');
		}

		console.log(`Managed to authorize, you can use the ingestion URL right away. Response code: ${res.status}`);
	} catch {
		// we used a valid URL, but did not manage to authorize, try again with the header
		// NOTE that we have to include everything between protocol and "@" sign
		const authHeaderValue = Buffer.from(':somesecret').toString('base64');

		// it's important to remove secrets from the URL here
		const res2 = await fetch(
			'https://tandem.autodesk.com/api/v1/timeseries/models/urn:adsk.dtm:APCMKgIDSyOFpZ763lew7Q/streams/AQAAAC6lzjQuhETds3FO9vuJy5EAAAAA',
			{
				method: 'POST',
				body: JSON.stringify(payload),
				headers: {
					authorization: `Basic ${authHeaderValue}`,
				},
			}
		);

		if (res2.status === 403) {
			throw new Error(`failed to authorize, are you sure this URL is correct? ${streamURL}`);
		}

		console.log(
			`Managed to authorize, but you will need to set auth header manually. Response code: ${res2.status}`
		);
		return;
	}

	/*
		STEP 3: interprete API response
		At this point, if everything is setup correctly, you can expect:
		1. HTTP 200 response, that would mean that data is stored and ready for retrieval
		2. HTTP 404, that would mean that payload was received, and stored as raw data, because Tandem failed to parse it. Most likely, the reason is that parsing rules are not configured yet. See step 1 for more details
	 */
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
