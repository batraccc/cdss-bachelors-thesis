import db from "../db/db.js";

export async function getDrugRecommendation(geneSymbol, phenotype, drugName) {
    const result = await db.query(
        "SELECT gdg.recommendation_summary, gdg.alternatives, gdg.evidence_level, gdg.source FROM gene_drug_guidelines gdg JOIN genes g ON g.id = gdg.gene_id JOIN drugs d ON d.id = gdg.drug_id WHERE g.symbol = $1 AND d.name = $2 AND gdg.phenotype = $3 AND gdg.guideline_version_id = (SELECT id FROM guideline_versions WHERE is_active = true)", [geneSymbol, drugName, phenotype]
    );

    if (result.rows.length === 0){
        return {
            message: "No specific pharmacogenetic reccomendation for this combination",
        };
    }

    return {
        recommendation: result.rows[0].recommendation_summary,
        alternatives: result.rows[0].alternatives,
        evidenceLevel: result.rows[0].evidence_level,
        source: result.rows[0].source,
    }
}