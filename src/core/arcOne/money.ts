import type { MoneyBand } from "@/core/arcOne/types";

export function canSpendMoney(band: MoneyBand, required?: MoneyBand | null): boolean {
  if (!required) return true;
  const order: MoneyBand[] = ["tight", "okay", "comfortable"];
  return order.indexOf(band) >= order.indexOf(required);
}

export function applyMoneyEffect(
  band: MoneyBand,
  effect?: "improve" | "worsen"
): MoneyBand {
  if (!effect) return band;
  if (effect === "improve") {
    if (band === "tight") return "okay";
    if (band === "okay") return "comfortable";
    return "comfortable";
  }
  if (band === "comfortable") return "okay";
  if (band === "okay") return "tight";
  return "tight";
}
