import pg from "pg";
import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

dotenv.config();

const db = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
})

const app = express();
const port = 3000;
app.use(bodyParser.json());
app.use(cors());

async function getGeneIdBySymbol(geneSymbol){
    try{
        const result = await db.query(
            "SELECT id FROM genes WHERE symbol = $1", [geneSymbol]
        );
        if(result.rows.length === 0){
            throw new Error(`Unknown gene symbol: ${geneSymbol}`);
        }
        return result.rows[0].id;
    } catch (err) {
        throw new Error("Database error");
    }
}

async function getActivityScore(geneId, diplotype){
    let totalScore = 0;

    for(let i=0; i<diplotype.length; i++){
        const alleleName = diplotype[i];
        const result = await db.query(
            "SELECT activity_score FROM alleles WHERE gene_id = $1 AND name = $2", [geneId, alleleName]
        );

        if(result.rows.length === 0){
            throw new Error(`Allele ${alleleName} not found for gene_id = ${geneId}`);
        }

        const alleleScore = Number(result.rows[0].activity_score);
        totalScore += alleleScore;
    }

    return totalScore;
}

async function getPhenotypeFromScore(geneId, activityScore){
    try{
        const result = await db.query(
            "SELECT phenotype, min_score, max_score FROM phenotype_rules WHERE gene_id = $1 AND $2 BETWEEN min_score AND max_score LIMIT 1", [geneId, activityScore]
        );
        if(result.rows.length === 0){
            throw new Error(`No phenotype rule matched for gene_id=${geneId} and score=${activityScore}`);
        }
        return result.rows[0].phenotype;
    } catch(err){
        throw new Error("Database error");
    }
}

async function interpretDiplotype(geneSymbol, diplotype){
    if(!geneSymbol || typeof(geneSymbol) !== "string"){
        throw new Error("geneSymbol is required");
    }
    if(!Array.isArray(diplotype) || diplotype.length !== 2){
        throw new Error("diplotype must be an array of execatly 2 alleles");
    }

    const geneId = await getGeneIdBySymbol(geneSymbol);
    const activityScore = await getActivityScore(geneId, diplotype);
    const phenotype = await getPhenotypeFromScore(geneId, activityScore);

    return {
        gene: geneSymbol,
        diplotype,
        activityScore,
        phenotype,
    };
}

async function appplyPhenoconversion(geneSymbol, baselinePhenotype, currentDrugs){
    let adjustedPhenotype = baselinePhenotype;
    let reason = null;

    for (let i = 0; i<currentDrugs.length;i++){
        const drugName = currentDrugs[i];
        const result = await db.query(
            "SELECT effect, strength FROM drug_gene_effects dge JOIN drugs d ON d.id = dge.drug_id JOIN genes g ON g.id = dge.gene_id WHERE d.name = $1 AND g.symbol = $2", [drugName, geneSymbol]
        );

        if (result.rows.length > 0){
            const effect = result.rows[0].effect;
            if(effect === "inhibitor"){
                if(baselinePhenotype == "NM"){
                    adjustedPhenotype = "IM";
                } else if(baselinePhenotype == "IM"){
                    adjustedPhenotype = "PM";
                }

                reason = `${drugName} inhibits ${geneSymbol}`;
                break;
            }
        }
    }

    return {
        baselinePhenotype,
        adjustedPhenotype,
        reason
    };
}

async function getDrugRecommendation(geneSymbol, phenotype, drugName) {
    const result = await db.query(
        "SELECT gdg.recommendation_summary, gdg.alternatives, gdg.evidence_level, gdg.source FROM gene_drug_guidelines gdg JOIN genes g ON g.id = gdg.gene_id JOIN drugs d ON d.id = gdg.drug_id WHERE g.symbol = $1 AND d.name = $2 AND gdg.phenotype = $3", [geneSymbol, drugName, phenotype]
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

app.post("/api/interpret/full", async(req,res) => {
    try{
        const {gene, diplotype, currentDrugs, plannedDrug} = req.body;
        
        const genotypeResult = await interpretDiplotype(gene, diplotype);

        const phenoconversionResult = await appplyPhenoconversion(
            gene,
            genotypeResult.phenotype,
            currentDrugs
        );

        const recommendation = await getDrugRecommendation(
            gene,
            phenoconversionResult.adjustedPhenotype,
            plannedDrug
        );

        res.json({
            ok: true,
            genetics: genotypeResult,
            phenoconversion: phenoconversionResult,
            recommendation,
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err.message
        });
    }
})

app.post("/api/interpret/phenoconversion", async (req, res) => {
    try{
        const {gene, phenotype, currentDrugs} = req.body;
        const result = await appplyPhenoconversion(
            gene,
            phenotype,
            currentDrugs
        );
        res.json({
            ok: true,
            result,
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err.message,
        });
    }
})

app.post("/api/interpret/genotype", async (req, res) => {
    try{
        const {gene, diplotype} = req.body;
        const result = await interpretDiplotype(gene, diplotype);
        res.json({
            ok: true,
            result
        });
    } catch (err){
        res.status(400).json({
            ok: false,
            error: err.message ?? "Unknown error"
        });
    }
})

app.get("/api/health", async(req, res) => {
    res.json({ok: true});
})


app.listen(port, (req, res) => {
    console.log(`Listening at port ${port}`);
})