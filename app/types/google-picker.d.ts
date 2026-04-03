export {};

type GooglePickerCallbackData = Record<string, unknown>;

type GooglePickerBuilder = {
  addView: (viewId: string) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setAppId: (appId: string) => GooglePickerBuilder;
  enableFeature: (feature: string) => GooglePickerBuilder;
  setCallback: (callback: (data: GooglePickerCallbackData) => void) => GooglePickerBuilder;
  build: () => {
    setVisible: (isVisible: boolean) => void;
  };
};

declare global {
  interface Window {
    gapi?: {
      load: (api: string, callback: () => void) => void;
    };
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
      picker?: {
        Action: {
          PICKED: string;
          CANCEL: string;
        };
        Response: {
          ACTION: string;
          DOCUMENTS: string;
        };
        Document: {
          ID: string;
          NAME: string;
          MIME_TYPE: string;
        };
        ViewId: {
          DOCS_IMAGES: string;
        };
        Feature: {
          NAV_HIDDEN: string;
        };
        PickerBuilder: new () => GooglePickerBuilder;
      };
    };
  }
}
