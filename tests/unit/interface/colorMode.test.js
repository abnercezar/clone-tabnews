import { readColorMode, writeColorMode } from "interface/colorMode";

const memory = new Map();

function installWindow() {
  global.window = {
    localStorage: {
      getItem(key) {
        return memory.has(key) ? memory.get(key) : null;
      },
      setItem(key, value) {
        memory.set(key, String(value));
      },
      clear() {
        memory.clear();
      },
    },
  };
}

describe("`interface/colorMode.js`", () => {
  afterEach(() => {
    memory.clear();
    delete global.window;
  });

  test("Defaults to auto when there is no browser storage", () => {
    delete global.window;
    expect(readColorMode()).toBe("auto");
  });

  test("Defaults to auto when nothing was stored", () => {
    installWindow();
    expect(readColorMode()).toBe("auto");
  });

  test("Ignores an unknown stored value", () => {
    installWindow();
    window.localStorage.setItem("agrotab-color-mode", "azul");
    expect(readColorMode()).toBe("auto");
  });

  test("Stores and reads day, night and auto", () => {
    installWindow();

    writeColorMode("night");
    expect(readColorMode()).toBe("night");

    writeColorMode("day");
    expect(readColorMode()).toBe("day");

    writeColorMode("auto");
    expect(readColorMode()).toBe("auto");
  });
});
