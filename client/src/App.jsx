import { useState } from 'react'
import './App.css'

function App() {
  const [gene, setGene] = useState("CYP2C19");
  const [allele1, setAllele1] = useState("*1");
  const [allele2, setAllele2] = useState("*2");
  const [currentDrugs, setCurrentDrugs] = useState("Omeprazole");
  const [plannedDrug, setPlannedDrug] = useState("Clopidogrel");

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [panelGenes, setPanelGenes] = useState([
    { gene: "CYP2D6", allele1: "*1", allele2: "*4" },
    { gene: "CYP2C19", allele1: "*1", allele2: "*2" }
  ]);
  
  const [panelCurrentDrugs, setPanelCurrentDrugs] = useState("Paroxetine");
  const [panelPlannedDrugs, setPanelPlannedDrugs] = useState("Codeine, Clopidogrel");
  
  const [panelResult, setPanelResult] = useState(null);

  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/interpret/genotype", {
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

  async function handlePanelSubmit(e) {
    e.preventDefault();
    setPanelResult(null);
  
    const payload = {
      genes: panelGenes.map(g => ({
        gene: g.gene,
        diplotype: [g.allele1, g.allele2]
      })),
      currentDrugs: panelCurrentDrugs.split(",").map(d => d.trim()),
      plannedDrugs: panelPlannedDrugs.split(",").map(d => d.trim())
    };
  
    const response = await fetch("/api/interpret/panel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  
    const data = await response.json();
    if (data.ok) {
      setPanelResult(data.result);
    } else {
      alert(data.error);
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
      <hr />
  <h2>Panel Interpret</h2>

  <form onSubmit={handlePanelSubmit}>

    {panelGenes.map((g, index) => (
      <div key={index}>
        <label>Gene</label>
        <input
          value={g.gene}
          onChange={e => {
            const copy = [...panelGenes];
            copy[index].gene = e.target.value;
            setPanelGenes(copy);
          }}
        />
        {" "}
        <label>Diplotype</label>
        <input
          value={g.allele1}
          onChange={e => {
            const copy = [...panelGenes];
            copy[index].allele1 = e.target.value;
            setPanelGenes(copy);
          }}
        />
        {" / "}
        <input
          value={g.allele2}
          onChange={e => {
            const copy = [...panelGenes];
            copy[index].allele2 = e.target.value;
            setPanelGenes(copy);
          }}
        />
      </div>
    ))}

    <br />
    <label>Current Drugs</label>
    <input
      value={panelCurrentDrugs}
      onChange={e => setPanelCurrentDrugs(e.target.value)}
      placeholder="Current drugs"
      style={{ width: "100%" }}
    />

    <br /><br />

    <label>PlannedDrugs</label>
    <input
      value={panelPlannedDrugs}
      onChange={e => setPanelPlannedDrugs(e.target.value)}
      placeholder="Planned drugs"
      style={{ width: "100%" }}
    />

    <br /><br />

    <button type="submit">Interpret Panel</button>
  </form>
{panelResult && (
  <div>
    <h3>Gene Results</h3>
    {panelResult.genes.map((g, i) => (
      <div key={i}>
        {g.gene} {g.diplotype} → {g.adjustedPhenotype}
      </div>
    ))}

    <h3>Drug Recommendations</h3>
    {panelResult.drugRecommendations.map((d, i) => (
  <div key={i}>
    <strong>{d.drug}</strong>

    {d.recommendations.length > 0 ? (
      d.recommendations.map((r, j) => (
        <div key={j}>
          {r.gene}: {r.recommendation}
        </div>
      ))
    ) : (
      <div style={{ color: "gray" }}>
        No pharmacogenetic warning for this panel.
      </div>
    )}
  </div>
))}
  </div>
)}
    </div>
  );
}


export default App
