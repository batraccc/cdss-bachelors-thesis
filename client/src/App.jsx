import { useState } from 'react'
import './App.css'

function App() {
  const [gene, setGene] = useState("CYP2C19");
  const [allele1, setAlelle1] = useState("*1");
  const [allele2, setAlelle2] = useState("*2");
  const [currentDrugs, setCurrentDrugs] = useState("Omeprazole");
  const [plannedDrug, setPlannedDrug] = useState("Clopidogrel");

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("api/interpret/full", {
        method: "POST",
        headers: {"Content-Type" : "application/json"},
        body: JSON.stringify({
          gene,
          diplotype: [allele1, allele2],
          currentDrugs: currentDrugs.split(",").map(d => d.trim()).filter(d => d.length > 0),
          plannedDrug
        })
      });

      const data = await response.json();

      if(!data.ok){
        throw new Error(data.error);
      }
      setResult(data);
    } catch (err){
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "Arial" }}>
      <h1>PGx Demo</h1>

      <form onSubmit={handleSubmit}>
        <h3>Input</h3>

        <label>
          Gene:
          <input value={gene} onChange={e => setGene(e.target.value)} />
        </label>
        <br /><br />

        <label>
          Diplotype:
          <input
            value={allele1}
            onChange={e => setAllele1(e.target.value)}
            style={{ width: 80 }}
          />
          {" / "}
          <input
            value={allele2}
            onChange={e => setAllele2(e.target.value)}
            style={{ width: 80 }}
          />
        </label>
        <br /><br />

        <label>
          Current drugs (comma separated):
          <input
            value={currentDrugs}
            onChange={e => setCurrentDrugs(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
        <br /><br />

        <label>
          Planned drug:
          <input
            value={plannedDrug}
            onChange={e => setPlannedDrug(e.target.value)}
          />
        </label>
        <br /><br />

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Interpret"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: 20 }}>
          Error: {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: 30 }}>
          <h3>Results</h3>

          <h4>Genetics</h4>
          <p>
            {result.genetics.gene} {result.genetics.diplotype.join("/")} →{" "}
            <strong>{result.genetics.phenotype}</strong>
          </p>

          <h4>Phenoconversion</h4>
          <p>
            Baseline: {result.phenoconversion.baselinePhenotype}<br />
            Effective: <strong>{result.phenoconversion.adjustedPhenotype}</strong><br />
            Reason: {result.phenoconversion.reason || "None"}
          </p>

          <h4>Clinical recommendation</h4>
          {result.recommendation.recommendation ? (
            <>
              <p><strong>{result.recommendation.recommendation}</strong></p>
              <p>Alternatives: {result.recommendation.alternatives}</p>
              <p>
                Evidence: {result.recommendation.evidenceLevel} ({result.recommendation.source})
              </p>
            </>
          ) : (
            <p>{result.recommendation.message}</p>
          )}
        </div>
      )}
    </div>
  );
}


export default App
