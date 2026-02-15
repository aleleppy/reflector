import type { ReflectorConfig } from "./types.js";

export const defaultConfig: ReflectorConfig = {
  naming: {
    propertyName: "filterWords",
    filterWords: [
      "Get",
      "Res",
      "Default",
      "Dto",
      "Public",
    ],
  },
};
