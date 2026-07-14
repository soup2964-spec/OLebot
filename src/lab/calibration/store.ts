import type { CalibrationRecord } from "./types";
import type { Persona, PersonaSet } from "@/shared/schema/persona";
import { PERSONA_SET_V1 } from "@/config/personas";
import { getLabDocument, getLabDocumentSync, LAB_DOC, setLabDocument } from "@/shared/db/lab-documents";

let calibrationCache: CalibrationRecord | null | undefined;

export async function loadCalibration(): Promise<CalibrationRecord | null> {
  if (calibrationCache !== undefined) return calibrationCache;
  calibrationCache = await getLabDocument<CalibrationRecord>(LAB_DOC.CALIBRATION);
  return calibrationCache;
}

export function loadCalibrationSync(): CalibrationRecord | null {
  return getLabDocumentSync<CalibrationRecord>(LAB_DOC.CALIBRATION);
}

export async function saveCalibration(record: CalibrationRecord) {
  calibrationCache = record;
  await setLabDocument(LAB_DOC.CALIBRATION, record);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function applyCalibration(base: PersonaSet, cal: CalibrationRecord | null): PersonaSet {
  if (!cal) return base;

  const { adjustments } = cal;
  const personas: Persona[] = base.personas.map((p) => ({
    ...p,
    ctaPropensity: clamp(
      p.ctaPropensity * adjustments.ctaPropensityMultiplier,
      0.05,
      0.95
    ),
    patienceSeconds: {
      ...p.patienceSeconds,
      mean: clamp(p.patienceSeconds.mean + adjustments.patienceSecondsDelta, 20, 180),
    },
    skimPropensity: clamp(p.skimPropensity + adjustments.skimPropensityDelta, 0.05, 0.95),
  }));

  return {
    version: base.version + cal.version,
    createdAt: cal.createdAt,
    changelog: cal.changelog,
    personas,
  };
}

/** Apply stored calibration adjustments to the base persona set. */
export async function getCalibratedPersonaSet(
  base: PersonaSet = PERSONA_SET_V1
): Promise<PersonaSet> {
  const cal = await loadCalibration();
  return applyCalibration(base, cal);
}

/** Sync path for scripts — reads filesystem snapshot only. */
export function getCalibratedPersonaSetSync(base: PersonaSet = PERSONA_SET_V1): PersonaSet {
  return applyCalibration(base, loadCalibrationSync());
}
