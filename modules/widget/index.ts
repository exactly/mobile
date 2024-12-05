declare global {
  namespace Native {
    interface CardMode {
      set(key: string, value: string, suite?: string): void;
    }
  }

  interface NativeModules {
    CardMode?: Native.CardMode;
  }
}

console.log("module", expo?.modules?.CardMode);

// TODO: Can we drop this?
const m = (expo?.modules?.CardMode ?? {
  set() {},
}) as Native.CardMode;

export default m;
