declare global {
  interface Window {
    __REDUX_STORE__?: {
      dispatch: (action: unknown) => void;
    };
  }
}

export {};
