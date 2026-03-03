import { z } from "zod";

export const SingleInterpretSchema = z.object({
  gene: z
    .string()
    .min(1, "Gene is required"),

    diplotype: z
    .array(
      z.string().min(1, "Allele cannot be empty")
    )
    .length(2, "Diplotype must contain exactly 2 alleles"),

  currentDrugs: z
    .array(z.string())
    .optional(),

  plannedDrug: z
    .string()
    .min(1, "Planned drug is required")
});