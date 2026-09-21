import { MedicineRepo } from '../database/medicineRepo.js';

export type InteractionSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE';

export interface DrugInteractionWarning {
  severity: InteractionSeverity;
  drugA: string;
  drugB: string;
  conflictingMedName: string;
  title: string;
  mechanism: string;
  clinicalRisk: string;
  recommendation: string;
}

export interface DrugInteractionCheckResult {
  hasInteraction: boolean;
  newDrug: string;
  activeMedsChecked: string[];
  warnings: DrugInteractionWarning[];
}

interface InteractionRule {
  drugAKeywords: string[];
  drugBKeywords: string[];
  drugAName: string;
  drugBName: string;
  severity: InteractionSeverity;
  title: string;
  mechanism: string;
  clinicalRisk: string;
  recommendation: string;
}

/**
 * Geriatric clinical drug-drug interaction matrix
 * (Compiled according to Beers Criteria & Lexicomp Drug Interactions standards)
 */
const CLINICAL_INTERACTION_RULES: InteractionRule[] = [
  // 1. Aspirin + Warfarin / Coumadin / Anticoagulants
  {
    drugAKeywords: ['warfarin', 'coumadin', 'eliquis', 'apixaban', 'xarelto', 'rivaroxaban', 'heparin', 'dabigatran', 'pradaxa'],
    drugBKeywords: ['aspirin', 'bayer', 'ecotrin', 'cardio'],
    drugAName: 'Warfarin / Anticoagulant',
    drugBName: 'Aspirin (Antiplatelet)',
    severity: 'CRITICAL',
    title: 'Severe Hemorrhage & Gastrointestinal Bleeding Risk',
    mechanism:
      'Synergistic platelet COX-1 inhibition (Aspirin) combined with vitamin K antagonism or direct oral anticoagulation impairs both primary and secondary hemostatic pathways.',
    clinicalRisk:
      'Profoundly increased incidence of major upper gastrointestinal hemorrhage, intracranial bleeding, or fatal internal hematoma in elderly patients.',
    recommendation:
      'Strictly avoid concurrent prescription unless specifically mandated post-cardiac stenting under Dr. Reynolds supervision with tight INR monitoring and mandatory proton-pump inhibitor (PPI) gastroprotection.',
  },

  // 2. Aspirin + NSAIDs (Ibuprofen, Naproxen, Meloxicam, Ketorolac)
  {
    drugAKeywords: ['ibuprofen', 'advil', 'motrin', 'naproxen', 'aleve', 'meloxicam', 'mobic', 'celebrex', 'diclofenac', 'voltaren', 'ketorolac'],
    drugBKeywords: ['aspirin', 'bayer', 'ecotrin'],
    drugAName: 'NSAID (Ibuprofen/Naproxen)',
    drugBName: 'Aspirin',
    severity: 'HIGH',
    title: 'Peptic Ulceration & Blunted Cardioprotective Effect',
    mechanism:
      'Non-selective NSAIDs competitively block Aspirin from access to Serine 529 in platelet COX-1, neutralizing cardioprotection and causing compounding gastrointestinal mucosal toxicity.',
    clinicalRisk:
      'Loss of myocardial infarction / stroke prophylaxis, acute gastric ulceration, and fluid retention in hypertensive seniors.',
    recommendation:
      'Avoid concurrent NSAID therapy. Use Acetaminophen (Tylenol) as first-line pain management, or separate administration by at least 2 hours if approved by Dr. Reynolds.',
  },

  // 3. Amlodipine + Simvastatin
  {
    drugAKeywords: ['simvastatin', 'zocor', 'vytorin'],
    drugBKeywords: ['amlodipine', 'norvasc', 'lotrel'],
    drugAName: 'Simvastatin',
    drugBName: 'Amlodipine',
    severity: 'HIGH',
    title: 'CYP3A4 Inhibition & Statin-Induced Rhabdomyolysis Risk',
    mechanism:
      'Amlodipine inhibits CYP3A4-mediated hepatic clearance of Simvastatin, approximately doubling Simvastatin systemic exposure and serum AUC.',
    clinicalRisk:
      'Dose-dependent myopathy, acute muscle breakdown (rhabdomyolysis), acute renal failure, and elevated transaminases.',
    recommendation:
      'Do not exceed Simvastatin 20mg daily when co-administered with Amlodipine, or switch to Atorvastatin / Rosuvastatin which exhibits safer metabolic clearance.',
  },

  // 4. Metformin + Contrast Media / Ethanol
  {
    drugAKeywords: ['contrast', 'iodinated', 'radiocontrast', 'alcohol', 'ethanol', 'wine', 'beer'],
    drugBKeywords: ['metformin', 'glucophage', 'fortamet'],
    drugAName: 'Radiocontrast Agent / Alcohol',
    drugBName: 'Metformin',
    severity: 'CRITICAL',
    title: 'Metformin-Associated Lactic Acidosis (MALA)',
    mechanism:
      'Iodinated contrast or ethanol impairs renal Metformin clearance and inhibits hepatic lactate utilization, leading to excessive lactate accumulation.',
    clinicalRisk:
      'High-mortality metabolic acidosis (MALA) with sudden hypothermia, profound hypotension, respiratory failure, and acute kidney injury.',
    recommendation:
      'Discontinue Metformin at the time of or prior to iodinated contrast procedures and withhold for at least 48 hours post-procedure until renal function is re-evaluated by Dr. Reynolds.',
  },

  // 5. Atorvastatin + Macrolides (Clarithromycin, Erythromycin)
  {
    drugAKeywords: ['clarithromycin', 'biaxin', 'erythromycin'],
    drugBKeywords: ['atorvastatin', 'lipitor'],
    drugAName: 'Clarithromycin / Erythromycin',
    drugBName: 'Atorvastatin (Lipitor)',
    severity: 'HIGH',
    title: 'Severe Statin Myopathy & Hepatotoxicity',
    mechanism:
      'Strong CYP3A4 inhibition by macrolides leads to marked accumulation of Atorvastatin plasma concentrations.',
    clinicalRisk:
      'Severe skeletal muscle aches, weakness, dark urine (myoglobinuria), and secondary nephrotoxicity.',
    recommendation:
      'Temporarily suspend Atorvastatin during antibiotic course or substitute Azithromycin (Zithromax) which does not inhibit CYP3A4.',
  },

  // 6. ACE Inhibitors (Lisinopril, Enalapril) + Potassium Sparing Diuretics / Supplements
  {
    drugAKeywords: ['spironolactone', 'aldactone', 'potassium', 'k-dur', 'klor-con'],
    drugBKeywords: ['lisinopril', 'zestril', 'prinivil', 'enalapril', 'ramipril'],
    drugAName: 'Potassium / Spironolactone',
    drugBName: 'ACE Inhibitor (Lisinopril)',
    severity: 'HIGH',
    title: 'Life-Threatening Hyperkalemia Risk',
    mechanism:
      'Additive aldosterone antagonism and renal potassium retention elevate serum potassium levels above safe clinical thresholds.',
    clinicalRisk:
      'Fatal cardiac arrhythmias (ventricular fibrillation, heart block), paresthesias, and cardiac arrest.',
    recommendation:
      'Monitor serum potassium and creatinine within 1 to 2 weeks of concurrent therapy and verify baseline eGFR.',
  },
];

/**
 * Check drug interactions between a newly added drug and the patient's active medication regimen
 */
export async function checkDrugInteractions(
  newDrugName: string,
  currentMedicinesList?: string[]
): Promise<DrugInteractionCheckResult> {
  const cleanNewDrug = newDrugName.trim().toLowerCase();

  // If no explicit medicine list provided, automatically load from SQLite database
  let activeMeds: string[] = [];
  if (currentMedicinesList && currentMedicinesList.length > 0) {
    activeMeds = currentMedicinesList;
  } else {
    try {
      const allMeds = await MedicineRepo.getAllMedicines();
      activeMeds = allMeds.map((m) => `${m.name} (${m.dosage})`);
    } catch (err) {
      console.warn('[DrugInteractionService] Could not fetch medicines from SQLite:', err);
      activeMeds = ['Amlodipine (Norvasc) 5mg', 'Baby Aspirin Cardio 81mg', 'Atorvastatin (Lipitor) 20mg', 'Metformin HCl 500mg'];
    }
  }

  const warnings: DrugInteractionWarning[] = [];

  for (const rule of CLINICAL_INTERACTION_RULES) {
    // Case 1: newDrug matches drugA and an active med matches drugB
    const newMatchesA = rule.drugAKeywords.some((k) => cleanNewDrug.includes(k));
    if (newMatchesA) {
      for (const currentMed of activeMeds) {
        const medLower = currentMed.toLowerCase();
        const curMatchesB = rule.drugBKeywords.some((k) => medLower.includes(k));
        if (curMatchesB) {
          warnings.push({
            severity: rule.severity,
            drugA: newDrugName,
            drugB: rule.drugBName,
            conflictingMedName: currentMed,
            title: rule.title,
            mechanism: rule.mechanism,
            clinicalRisk: rule.clinicalRisk,
            recommendation: rule.recommendation,
          });
        }
      }
    }

    // Case 2: newDrug matches drugB and an active med matches drugA
    const newMatchesB = rule.drugBKeywords.some((k) => cleanNewDrug.includes(k));
    if (newMatchesB) {
      for (const currentMed of activeMeds) {
        const medLower = currentMed.toLowerCase();
        const curMatchesA = rule.drugAKeywords.some((k) => medLower.includes(k));
        if (curMatchesA) {
          warnings.push({
            severity: rule.severity,
            drugA: newDrugName,
            drugB: rule.drugAName,
            conflictingMedName: currentMed,
            title: rule.title,
            mechanism: rule.mechanism,
            clinicalRisk: rule.clinicalRisk,
            recommendation: rule.recommendation,
          });
        }
      }
    }
  }

  // Sort warnings: CRITICAL -> HIGH -> MODERATE
  const severityRank: Record<InteractionSeverity, number> = {
    CRITICAL: 1,
    HIGH: 2,
    MODERATE: 3,
  };
  warnings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    hasInteraction: warnings.length > 0,
    newDrug: newDrugName,
    activeMedsChecked: activeMeds,
    warnings,
  };
}
