export type OAuth2PopupParams = {
    clientId: string;
    redirectUri: string;
    scope: string;
    state: string;
    responseType: string;
    authorizationUrl: string;
    popupOptions: string;
};

export const openOAuth2Popup = (params: OAuth2PopupParams): Window => {
    const { clientId, redirectUri, scope, state, responseType, authorizationUrl, popupOptions } = params;

    const url = `${authorizationUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_type=${responseType}`;

    return window.open(
        url,
        'oauth2Popup',
        `width=${100},height=${100},top=${100},left=${100}`
    );
};

export const getOAuth2Token = async (authorizationCode: string, clientId: string, clientSecret: string, redirectUri: string, tokenUrl: string): Promise<any> => {
    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `code=${authorizationCode}&client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectUri}&grant_type=authorization_code`,
    });

    return await response.json();
};
