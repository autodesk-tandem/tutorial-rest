async function main() {
    /*
        STEP 1 - Construct payload
		Autodesk Tandem expects payload to be a valid JSON
		in the given example we will report readings from two sensors, containing air temperature and air pressure values.
        Make sure to use correct stream ids from your facility
    */
    const payload = [
        {
            temperatureValue: 25,
            pressureValue: 100,
            id: 'AQAAAJVLslwb80o0jqA8wgUzxPYAAAAA'
        },
        {
            temperatureValue: 23,
            pressureValue: 95,
            id: 'AQAAAJVLslwb90o0jqA9wgUzxQYAAAAA'
        }
    ];
    /*
        STEP 2 - Generate 2-legged access token using APS authentication service.
        Note that service needs to be added to the facility or to account. It's also possible to use 3-legged token if data
        should be send on behalf of specific user. For more details regarding Authentication service check documentation on
        APS Portal (https://aps.autodesk.com/en/docs/oauth/v2/developers_guide/overview/).
    */
    const clientID = 'YOUR_CLIENT_ID';
    const clientSecret = 'YOUR_CLIENT_SECRET';
    const scope = 'data:read data:write';
    const auth = Buffer.from(`${clientID}:${clientSecret}`).toString('base64');
    const options = new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': scope
    });

    const tokenResponse = await fetch(`https://developer.api.autodesk.com/authentication/v2/token?${options}`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`
        }
    });

    const token = await tokenResponse.json();
    /*
        STEP 3 - Post data to Tandem
    */
    const modelID = 'YOUR_TANDEM_MODEL_ID';
    const dataResponse = await fetch(`https://tandem.autodesk.com/api/v1/timeseries/models/${modelID}/webhooks/generic`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token.access_token}`
        },
        body: JSON.stringify(payload)
    });

    if (dataResponse.status === 403) {
        throw new Error(`failed to authorize, check your token/scope.`);
    }

    console.log(
        `Managed to authorize, data sent to facility. Response code: ${dataResponse.status}`
    );
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
