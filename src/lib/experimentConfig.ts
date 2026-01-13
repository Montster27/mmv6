export type ExperimentConfig = {
  enableMiniGame: boolean;
  enableSocial: boolean;
  uiVariant: "cards" | "dashboard";
  cadenceVariant: "light" | "standard";
};

export const defaultExperimentConfig: ExperimentConfig = {
  enableMiniGame: true,
  enableSocial: true,
  uiVariant: "cards",
  cadenceVariant: "standard",
};

export function getExperimentConfig(): ExperimentConfig {
  return defaultExperimentConfig;
}
