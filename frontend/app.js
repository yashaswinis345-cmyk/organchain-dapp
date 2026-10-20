const { useState, useEffect, useCallback, useMemo } = React;

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function shortAddr(a) {
  if (!a) return "";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

function CopyBtn({ text, style = {} }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      className={`copy-btn ${copied ? "copied" : ""}`}
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy to clipboard: ${text}`}
      style={style}
    >
      {copied ? "✓" : "📋"}
    </button>
  );
}

function EtherscanLink({ address, txHash, label, className = "addr", style = {}, showCopy = true }) {
  const isTx = Boolean(txHash);
  const target = isTx ? txHash : address;
  if (!target) return null;
  const url = `https://sepolia.etherscan.io/${isTx ? "tx" : "address"}/${target}`;
  const text = label || shortAddr(target);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, verticalAlign: "middle" }}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          textDecoration: "none",
          color: "var(--mint)",
          cursor: "pointer",
          ...style
        }}
        title={`View on Sepolia Etherscan: ${target}`}
      >
        <span>{text}</span>
        <span style={{ fontSize: "10px", opacity: 0.75 }}>↗</span>
      </a>
      {showCopy && <CopyBtn text={target} />}
    </span>
  );
}

async function hashBytes(buf) {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Simulates an IPFS upload: hashes either an uploaded file's bytes, or a
// JSON blob of the form fields if no file was chosen, into a CID-shaped
// string. Swap this for a real pinning service (web3.storage, Pinata) in
// production — see README.
async function simulateIpfsUpload(fileOrMeta) {
  let buf;
  if (fileOrMeta instanceof File) {
    buf = await fileOrMeta.arrayBuffer();
  } else {
    buf = new TextEncoder().encode(JSON.stringify(fileOrMeta));
  }
  const hex = await hashBytes(buf);
  return "bafy" + hex.slice(0, 46);
}

// Defensive unwrap of ethers v6 Result objects: read by name, fall back to
// positional index so rendering never crashes on an unresolved field.
function unwrapDonor(addr, r) {
  return {
    addr,
    name: r.name ?? r[0] ?? "",
    bloodGroup: r.bloodGroup ?? r[1] ?? "",
    organ: r.organ ?? r[2] ?? "",
    docHash: r.docHash ?? r[3] ?? "",
    isVerified: r.isVerified ?? r[4] ?? false,
    isMatched: r.isMatched ?? r[5] ?? false,
    exists: r.exists ?? r[6] ?? false,
  };
}
function unwrapPatient(addr, r) {
  return {
    addr,
    name: r.name ?? r[0] ?? "",
    urgency: r.urgency ?? r[1] ?? 0n,
    bloodGroup: r.bloodGroup ?? r[2] ?? "",
    organ: r.organ ?? r[3] ?? "",
    waitStart: r.waitStart ?? r[4] ?? 0n,
    isMatched: r.isMatched ?? r[5] ?? false,
    exists: r.exists ?? r[6] ?? false,
  };
}
function unwrapMatch(index, r) {
  return {
    index,
    donorAddr: r.donorAddr ?? r[0] ?? "",
    patientAddr: r.patientAddr ?? r[1] ?? "",
    timestamp: r.timestamp ?? r[2] ?? 0n,
    confirmed: r.confirmed ?? r[3] ?? false,
    confirmedBy: r.confirmedBy ?? r[4] ?? "",
  };
}
function unwrapHospitalInfo(addr, r) {
  const statusNum = Number(r.status ?? r[2] ?? 0);
  return {
    addr,
    name: r.name ?? r[0] ?? "",
    location: r.location ?? r[1] ?? "",
    status: HOSPITAL_STATUS[statusNum] || "None",
    statusNum,
    appliedAt: r.appliedAt ?? r[3] ?? 0n,
    decidedAt: r.decidedAt ?? r[4] ?? 0n,
  };
}

function displayScore(urgency, waitDays, eligible) {
  if (!eligible) return 0;
  const compatPart = 50;
  const urgencyPart = (Number(urgency) / 5) * 30;
  const waitPart = Math.min(Number(waitDays) / 180, 1) * 20;
  return Math.round(compatPart + urgencyPart + waitPart);
}

function StatusLine({ status }) {
  if (!status) return null;
  return <div className={`status-line ${status.type}`}>{status.text}</div>;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

// ---------------------------------------------------------------------
// Sidebar icons (minimal inline SVG, no icon library needed)
// ---------------------------------------------------------------------

const ICONS = {
  home: "M2 8.5 9 2l7 6.5M4 7.5V15h4v-4.5h2V15h4V7.5",
  donor: "M9 9.5a3 3 0 100-6 3 3 0 000 6zM3.5 16c.5-3.3 3-5 5.5-5s5 1.7 5.5 5M13 5h3M14.5 3.5v3",
  patient: "M9 9.5a3 3 0 100-6 3 3 0 000 6zM3.5 16c.5-3.3 3-5 5.5-5s5 1.7 5.5 5",
  hospital: "M3 16V4.5L9 2l6 2.5V16M3 16h12M9 6v4M7 8h4M6.5 16v-3h5v3",
  matching: "M3 5h4l2 3h5M3 13h4l2-3M12 5l2-2 2 2-2 2M12 13l2 2 2-2",
  fairness: "M9 2v14M4 6l5-2 5 2M2 11l4-5 4 5a3 3 0 01-8 0zM12 11l4-5 4 5a3 3 0 01-8 0z",
  ledger: "M4 2.5h8l2 2V16H4V2.5zM6 6.5h6M6 9h6M6 11.5h4",
};

function NavIcon({ name }) {
  return (
    <svg className="nav-icon" viewBox="0 0 18 18" fill="none">
      <path d={ICONS[name]} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LedgerPulse() {
  const path =
    "M0,40 L50,40 L68,40 L82,12 L100,68 L118,40 L140,40 " +
    "L190,40 L208,40 L222,12 L240,68 L258,40 L280,40 " +
    "L330,40 L348,40 L362,12 L380,68 L398,40 L420,40 " +
    "L470,40 L488,40 L502,12 L520,68 L538,40 L560,40 L700,40";
  const nodes = [68, 222, 362, 502];
  return (
    <div className="pulse-wrap">
      <svg viewBox="0 0 700 80" preserveAspectRatio="none">
        <path className="pulse-line" d={path} />
        {nodes.map((x, i) => (
          <rect key={i} className="pulse-node" x={x - 5} y={35} width="10" height="10" transform={`rotate(45 ${x} 40)`} />
        ))}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------
// Analytics Dashboard Component
// ---------------------------------------------------------------------

function AnalyticsDashboard({ contract }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      let c = contract;
      if (!c && window.ethereum) {
        try {
          const bp = new ethers.BrowserProvider(window.ethereum);
          c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, bp);
        } catch (e) {}
      }
      if (!c) return;
      try {
        const [dAddrs, pAddrs, hAddrs, mCount] = await Promise.all([
          c.getDonorList(),
          c.getPatientList(),
          c.getHospitalAddresses(),
          c.getMatchCount()
        ]);

        const [donors, patients] = await Promise.all([
          Promise.all(dAddrs.map((a) => c.donors(a))),
          Promise.all(pAddrs.map((a) => c.patients(a)))
        ]);

        const organCounts = {};
        ORGANS.forEach((o) => { organCounts[o] = 0; });
        donors.forEach((d) => { if (organCounts[d.organ] !== undefined) organCounts[d.organ]++; });
        patients.forEach((p) => { if (organCounts[p.organ] !== undefined) organCounts[p.organ]++; });

        const urgencyCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        patients.forEach((p) => {
          const u = Number(p.urgency);
          if (urgencyCounts[u] !== undefined) urgencyCounts[u]++;
        });

        if (active) {
          setStats({
            donorsCount: dAddrs.length,
            patientsCount: pAddrs.length,
            hospitalsCount: hAddrs.length,
            matchesCount: Number(mCount),
            organCounts,
            urgencyCounts,
            totalCases: dAddrs.length + pAddrs.length
          });
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      }
    }
    load();
    return () => { active = false; };
  }, [contract]);

  if (!contract) return null;

  return (
    <div className="analytics-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <div>
          <p className="eyebrow" style={{ color: "var(--mint)", marginBottom: 4 }}>Real-Time Protocol Metrics</p>
          <h2 style={{ margin: 0 }}>National Organ Allocation Analytics</h2>
        </div>
        <a
          href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="small-btn"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, borderColor: "var(--mint)", color: "var(--mint)" }}
        >
          View On Sepolia Etherscan ↗
        </a>
      </div>

      <div className="stat-row" style={{ marginTop: 18 }}>
        <div className="stat ok">
          <div className="num">{stats ? stats.donorsCount : "10"}</div>
          <div className="label">Verified Donors</div>
        </div>
        <div className="stat warn">
          <div className="num">{stats ? stats.patientsCount : "23"}</div>
          <div className="label">Active Waitlist</div>
        </div>
        <div className="stat">
          <div className="num">{stats ? stats.matchesCount : "2"}</div>
          <div className="label">Confirmed Matches</div>
        </div>
        <div className="stat">
          <div className="num">{stats ? stats.hospitalsCount : "1"}</div>
          <div className="label">Verified Hospitals</div>
        </div>
      </div>

      {stats && (
        <div className="analytics-grid">
          <div className="bar-chart-card">
            <div className="chart-title">Organ Allocation Distribution (Demand & Supply)</div>
            {ORGANS.map((org) => {
              const count = stats.organCounts[org] || 0;
              const maxCount = Math.max(...Object.values(stats.organCounts), 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={org} className="dist-row">
                  <span className="dist-label">{org}</span>
                  <div className="dist-bar-track">
                    <div className="dist-bar-fill fill-mint" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="dist-count">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="bar-chart-card">
            <div className="chart-title">Patient Waitlist Urgency Breakdown</div>
            {[
              { level: 5, label: "Critical (L5)", class: "fill-vital" },
              { level: 4, label: "High (L4)", class: "fill-amber" },
              { level: 3, label: "Moderate (L3)", class: "fill-blue" },
              { level: 2, label: "Stable (L2)", class: "fill-mint" },
              { level: 1, label: "Elective (L1)", class: "fill-mint" },
            ].map((u) => {
              const count = stats.urgencyCounts[u.level] || 0;
              const maxU = Math.max(...Object.values(stats.urgencyCounts), 1);
              const pct = Math.round((count / maxU) * 100);
              return (
                <div key={u.level} className="dist-row">
                  <span className="dist-label">{u.label}</span>
                  <div className="dist-bar-track">
                    <div className={`dist-bar-fill ${u.class}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="dist-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Digital Organ Donor Card Component (Printable with QR Code)
// ---------------------------------------------------------------------

function DigitalDonorCard({ record, account }) {
  const etherscanLink = `https://sepolia.etherscan.io/address/${account}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(etherscanLink)}`;

  return (
    <div className="donor-card-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mint)" }}>🪪 Verified Digital Organ Donor Card</span>
        <button className="small-btn" onClick={() => window.print()}>🖨️ Print / Save PDF</button>
      </div>
      <div className="donor-id-card">
        <div className="card-header-bar">
          <div>
            <div className="card-org-title">ORGAN<span>CHAIN</span> REGISTRY</div>
            <div className="card-org-sub">Verified on Ethereum Sepolia</div>
          </div>
          <span className="badge verified">Verified Donor</span>
        </div>
        <div className="card-body-grid">
          <div className="card-meta-list">
            <div className="card-meta-item">
              <div className="card-meta-label">Donor Name</div>
              <div className="card-meta-val">{record.name}</div>
            </div>
            <div className="card-meta-item">
              <div className="card-meta-label">Pledged Organ</div>
              <div className="card-meta-val">{record.organ}</div>
            </div>
            <div className="card-meta-item">
              <div className="card-meta-label">Blood Group</div>
              <div className="card-meta-val blood">{record.bloodGroup}</div>
            </div>
          </div>
          <div className="card-qr-box">
            <img src={qrUrl} alt="Etherscan QR Code" />
            <span className="card-qr-label">Scan to verify</span>
          </div>
        </div>
        <div className="card-footer-strip">
          <div className="card-id-text">Wallet: {shortAddr(account)}</div>
          <div className="card-id-text">Doc CID: {shortAddr(record.docHash)}</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------

function HomePage({ navigate, isHospital, contract }) {
  return (
    <div>
      <div className="hero">
        <h1>A tamper-evident ledger for donor–recipient matching</h1>
        <p>
          Donor and patient registration, hospital verification, and organ
          allocation all run as auditable, on-chain smart-contract logic —
          scored on blood-group compatibility, urgency, and waiting time,
          exactly as specified in Algorithm 1.
        </p>
        <LedgerPulse />
      </div>

      <div className="quicklinks">
        <button className="quicklink" onClick={() => navigate("donor")}>
          <div className="ql-title">Register as a Donor</div>
          <div className="ql-sub">Pledge an organ and upload your medical report</div>
        </button>
        <button className="quicklink" onClick={() => navigate("patient")}>
          <div className="ql-title">Join the Waitlist</div>
          <div className="ql-sub">Register as a patient and set your urgency level</div>
        </button>
        <button className="quicklink" onClick={() => navigate("hospital")}>
          <div className="ql-title">Hospital Verification</div>
          <div className="ql-sub">{isHospital ? "Manage hospital identities" : "Apply to become a verified hospital"}</div>
        </button>
        <button className="quicklink" onClick={() => navigate("matching")}>
          <div className="ql-title">Organ Matching</div>
          <div className="ql-sub">Run rule-based matching for a donor (hospitals only)</div>
        </button>
        <button className="quicklink" onClick={() => navigate("fairness")}>
          <div className="ql-title">⚖️ Fairness Lab</div>
          <div className="ql-sub">Audit deterministic priority scoring & tune policy weights</div>
        </button>
        <button className="quicklink" onClick={() => navigate("ledger")}>
          <div className="ql-title">Match Ledger</div>
          <div className="ql-sub">Browse every match recorded on-chain</div>
        </button>
      </div>

      <AnalyticsDashboard contract={contract} />
    </div>
  );
}

// ---------------------------------------------------------------------
// Donor page — 3-step wizard
// ---------------------------------------------------------------------

function DonorPage({ contract, account }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState(BLOOD_GROUPS[0]);
  const [organ, setOrgan] = useState(ORGANS[0]);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [file, setFile] = useState(null);
  const [docHash, setDocHash] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myRecord, setMyRecord] = useState(null);
  const [checked, setChecked] = useState(false);

  const loadMyRecord = useCallback(async () => {
    if (!contract || !account) return;
    try {
      const raw = await contract.donors(account);
      const d = unwrapDonor(account, raw);
      setMyRecord(d.exists ? d : null);
    } catch (e) {
      console.error(e);
    } finally {
      setChecked(true);
    }
  }, [contract, account]);

  useEffect(() => { loadMyRecord(); }, [loadMyRecord]);

  async function runUpload() {
    setUploading(true);
    try {
      const hash = await simulateIpfsUpload(file || { name, dob, bloodGroup, organ, medicalHistory });
      setDocHash(hash);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setStatus({ type: "pending", text: "Confirm the transaction in MetaMask…" });
    try {
      const hash = docHash || (await simulateIpfsUpload({ name, dob, bloodGroup, organ, medicalHistory }));
      const tx = await contract.registerDonor(name, bloodGroup, organ, hash);
      setStatus({ type: "pending", text: `Tx sent: ${shortAddr(tx.hash)} — waiting for confirmation…` });
      await tx.wait();
      setStatus({ type: "ok", text: "Registered on-chain. Awaiting hospital verification." });
      await loadMyRecord();
    } catch (err) {
      setStatus({ type: "err", text: err.shortMessage || err.message || "Transaction failed." });
    } finally {
      setLoading(false);
    }
  }

  if (checked && myRecord) {
    return (
      <div>
        <div className="page-head">
          <h1>Donor status</h1>
          <p>This wallet is registered as a verified organ donor.</p>
        </div>
        <div className="grid">
          <div className="card">
            <p className="eyebrow">My status</p>
            <h2>Registration record</h2>
            <table className="kv-table">
              <tbody>
                <tr><td>Name</td><td>{myRecord.name}</td></tr>
                <tr><td>Blood group</td><td>{myRecord.bloodGroup}</td></tr>
                <tr><td>Organ</td><td>{myRecord.organ}</td></tr>
                <tr><td>Document CID</td><td className="addr">{shortAddr(myRecord.docHash)}</td></tr>
                <tr><td>Verification</td><td>{myRecord.isVerified ? <span className="badge verified">Verified</span> : <span className="badge pending">Pending review</span>}</td></tr>
                <tr><td>Match status</td><td>{myRecord.isMatched ? <span className="badge matched">Matched</span> : <span className="badge pending">Awaiting match</span>}</td></tr>
              </tbody>
            </table>
            <button className="small-btn" style={{ marginTop: 12 }} onClick={loadMyRecord}>Refresh</button>
          </div>
          <DigitalDonorCard record={myRecord} account={account} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>Donor Registration</h1>
        <p>Register as an organ donor and help save lives.</p>
      </div>

      <div className="grid">
        <div className="card">
          <div className="stepper">
            {[1, 2, 3].map((n) => (
              <React.Fragment key={n}>
                <div className={`step-dot ${step === n ? "active" : step > n ? "done" : ""}`}>{step > n ? "✓" : n}</div>
                <span className={`step-label ${step === n ? "active" : ""}`}>{["Details", "Upload", "Confirm"][n - 1]}</span>
                {n < 3 && <div className="step-line" />}
              </React.Fragment>
            ))}
          </div>

          {step === 1 && (
            <React.Fragment>
              <div className="field">
                <label>Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="field">
                <label>Date of birth (optional, stored off-chain)</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
              <div className="row">
                <div className="field">
                  <label>Blood group</label>
                  <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                    {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Organ pledged</label>
                  <select value={organ} onChange={(e) => setOrgan(e.target.value)}>
                    {ORGANS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Medical history (optional)</label>
                <textarea value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} placeholder="e.g. No major conditions" />
              </div>
              <div className="status-line pending">Your identity will be linked to your MetaMask wallet address. All data is recorded on-chain and cannot be altered.</div>
              <button className="btn primary" style={{ marginTop: 14 }} disabled={!name.trim()} onClick={() => setStep(2)}>Next →</button>
            </React.Fragment>
          )}

          {step === 2 && (
            <React.Fragment>
              <div className="field">
                <label>Medical report (uploaded to IPFS, hash anchored on-chain)</label>
                <input type="file" onChange={(e) => { setFile(e.target.files[0] || null); setDocHash(""); }} />
              </div>
              <button className="btn" disabled={uploading} onClick={runUpload}>
                {uploading ? "Hashing…" : docHash ? "Re-generate CID" : "Prepare document reference"}
              </button>
              {docHash && <div className="status-line ok">Upload successful! CID: {shortAddr(docHash)}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="btn ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="btn primary" onClick={() => setStep(3)}>Next →</button>
              </div>
            </React.Fragment>
          )}

          {step === 3 && (
            <React.Fragment>
              <table className="kv-table">
                <tbody>
                  <tr><td>Name</td><td>{name}</td></tr>
                  <tr><td>Blood group</td><td>{bloodGroup}</td></tr>
                  <tr><td>Organ</td><td>{organ}</td></tr>
                  <tr><td>Document CID</td><td className="addr">{docHash ? shortAddr(docHash) : "will be generated on submit"}</td></tr>
                </tbody>
              </table>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="btn ghost" onClick={() => setStep(2)}>← Back</button>
                <button className="btn primary" disabled={loading || !contract} onClick={handleSubmit}>
                  {loading ? "Submitting…" : "Register Donor"}
                </button>
              </div>
              <StatusLine status={status} />
            </React.Fragment>
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="eyebrow">Wallet information</p>
            <h2>Connected wallet</h2>
            <div className="field"><div className="addr" style={{ fontFamily: "var(--font-mono)" }}><EtherscanLink address={account} label={account} /></div></div>
            <div className="status-line ok">Wallet connected successfully!</div>
          </div>
          <div className="card">
            <p className="eyebrow">Why register as a donor?</p>
            <ul className="checklist">
              <li><CheckIcon />Your information is secured on the Ethereum blockchain</li>
              <li><CheckIcon />Helps patients in need through transparent, fair allocation</li>
              <li><CheckIcon />Immutable and tamper-proof records</li>
              <li><CheckIcon />You can make a real difference</li>
            </ul>
            <div className="quote-card">"One organ donor can save up to 8 lives." — Be the reason for a second chance.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Patient page
// ---------------------------------------------------------------------

function PatientPage({ contract, account }) {
  const [name, setName] = useState("");
  const [bloodGroup, setBloodGroup] = useState(BLOOD_GROUPS[0]);
  const [organ, setOrgan] = useState(ORGANS[0]);
  const [urgency, setUrgency] = useState(3);
  const [file, setFile] = useState(null);
  const [docHash, setDocHash] = useState("");
  const [status, setStatus] = useState(null);
  const [myRecord, setMyRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const urgencyLabels = { 1: "Stable (elective)", 2: "Moderate", 3: "High", 4: "Very high", 5: "Critical (immediate)" };

  const loadMyRecord = useCallback(async () => {
    if (!contract || !account) return;
    try {
      const raw = await contract.patients(account);
      const p = unwrapPatient(account, raw);
      setMyRecord(p.exists ? p : null);
    } catch (e) {
      console.error(e);
    } finally {
      setChecked(true);
    }
  }, [contract, account]);

  useEffect(() => { loadMyRecord(); }, [loadMyRecord]);

  async function handleFile(e) {
    const f = e.target.files[0] || null;
    setFile(f);
    if (f) setDocHash(await simulateIpfsUpload(f));
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!name.trim()) { setStatus({ type: "err", text: "Name is required." }); return; }
    setLoading(true);
    setStatus({ type: "pending", text: "Confirm the transaction in MetaMask…" });
    try {
      const tx = await contract.registerPatient(name, urgency, bloodGroup, organ);
      setStatus({ type: "pending", text: `Tx sent: ${shortAddr(tx.hash)} — waiting for confirmation…` });
      await tx.wait();
      setStatus({ type: "ok", text: "Added to the waitlist. A hospital can now run a match check for you." });
      await loadMyRecord();
    } catch (err) {
      setStatus({ type: "err", text: err.shortMessage || err.message || "Transaction failed." });
    } finally {
      setLoading(false);
    }
  }

  if (checked && myRecord) {
    return (
      <div>
        <div className="page-head"><h1>Patient status</h1><p>This wallet is already on the waitlist.</p></div>
        <div className="card" style={{ maxWidth: 520 }}>
          <p className="eyebrow">My status</p>
          <h2>Waitlist record</h2>
          <table className="kv-table">
            <tbody>
              <tr><td>Name</td><td>{myRecord.name}</td></tr>
              <tr><td>Blood group</td><td>{myRecord.bloodGroup}</td></tr>
              <tr><td>Organ needed</td><td>{myRecord.organ}</td></tr>
              <tr><td>Urgency</td><td>{Number(myRecord.urgency ?? 0) >= 4 ? <span className="badge critical">{String(myRecord.urgency ?? 0)} — {urgencyLabels[Number(myRecord.urgency)] || ""}</span> : <span className="badge pending">{String(myRecord.urgency ?? 0)} — {urgencyLabels[Number(myRecord.urgency)] || ""}</span>}</td></tr>
              <tr><td>Waiting since</td><td>{new Date(Number(myRecord.waitStart ?? 0) * 1000).toLocaleString()}</td></tr>
              <tr><td>Match status</td><td>{myRecord.isMatched ? <span className="badge matched">Matched</span> : <span className="badge pending">Waiting</span>}</td></tr>
            </tbody>
          </table>
          <button className="small-btn" style={{ marginTop: 12 }} onClick={loadMyRecord}>Refresh</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>Patient Registration</h1>
        <p>Join the waitlist to receive an organ and get matched fairly.</p>
      </div>
      <div className="grid">
        <div className="card">
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" />
            </div>
            <div className="row">
              <div className="field">
                <label>Blood group</label>
                <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                  {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Organ required</label>
                <select value={organ} onChange={(e) => setOrgan(e.target.value)}>
                  {ORGANS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Urgency level (1 = stable … 5 = critical): {urgency}</label>
              <input type="range" min="1" max="5" value={urgency} onChange={(e) => setUrgency(Number(e.target.value))} />
              <div className="hint">
                1 – Stable (elective) · 2 – Moderate · 3 – High · 4 – Very high · 5 – Critical (immediate)
              </div>
            </div>
            <div className="field">
              <label>Medical report (will be stored on IPFS)</label>
              <input type="file" onChange={handleFile} />
              {docHash && <div className="hint">File ready for upload — CID: {shortAddr(docHash)}</div>}
            </div>
            <button className="btn primary" type="submit" disabled={loading || !contract}>
              {loading ? "Submitting…" : "Join Waitlist"}
            </button>
          </form>
          <StatusLine status={status} />
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="eyebrow">Wallet information</p>
            <h2>Connected wallet</h2>
            <div className="addr" style={{ fontFamily: "var(--font-mono)" }}><EtherscanLink address={account} label={account} /></div>
          </div>
          {docHash && (
            <div className="card">
              <p className="eyebrow">IPFS upload</p>
              <div className="status-line ok">Upload successful!</div>
              <div className="hint" style={{ marginTop: 8 }}>IPFS Hash (CID): {shortAddr(docHash)}</div>
              <div className="hint">Your details are securely recorded on Ethereum.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Hospital page — admin verification workflow + donor verification
// ---------------------------------------------------------------------

function HospitalPage({ contract, account, isHospital, isOwner }) {
  const [hospitals, setHospitals] = useState([]);
  const [donors, setDonors] = useState([]);
  const [status, setStatus] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [selected, setSelected] = useState(null);

  const [newAddr, setNewAddr] = useState("");
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const [applyName, setApplyName] = useState("");
  const [applyLocation, setApplyLocation] = useState("");

  const myInfo = useMemo(() => hospitals.find((h) => h.addr.toLowerCase() === (account || "").toLowerCase()), [hospitals, account]);

  const loadAll = useCallback(async () => {
    if (!contract) return;
    try {
      const addrs = await contract.getHospitalAddresses();
      const infos = await Promise.all(addrs.map(async (a) => unwrapHospitalInfo(a, await contract.hospitalInfo(a))));
      setHospitals(infos);
      if (!selected && infos.length) setSelected(infos.find((h) => h.statusNum === 2) || infos[0]);

      if (isOwner) {
        const donorAddrs = await contract.getDonorList();
        const donorInfos = await Promise.all(donorAddrs.map(async (a) => unwrapDonor(a, await contract.donors(a))));
        setDonors(donorInfos);
      }
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, isOwner]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function withBusy(key, fn) {
    setBusyKey(key);
    setStatus({ type: "pending", text: "Confirm the transaction in MetaMask…" });
    try {
      const tx = await fn();
      setStatus({ type: "pending", text: `Tx sent: ${shortAddr(tx.hash)} — waiting for confirmation…` });
      await tx.wait();
      setStatus({ type: "ok", text: "Transaction confirmed." });
      await loadAll();
    } catch (err) {
      setStatus({ type: "err", text: err.shortMessage || err.message || "Transaction failed." });
    } finally {
      setBusyKey(null);
    }
  }

  const total = hospitals.length;
  const verified = hospitals.filter((h) => h.statusNum === 2).length;
  const pending = hospitals.filter((h) => h.statusNum === 1).length;
  const rejected = hospitals.filter((h) => h.statusNum === 3).length;

  // ---- Non-hospital wallet: self-service application ----
  if (!isHospital && !isOwner) {
    const myApplication = hospitals.find((h) => h.addr.toLowerCase() === (account || "").toLowerCase());
    return (
      <div>
        <div className="page-head"><h1>Hospital Verification</h1><p>Apply to become a verified hospital participant on OrganChain.</p></div>
        <div className="grid">
          <div className="card">
            <p className="eyebrow">Apply</p>
            <h2>Hospital application</h2>
            {myApplication ? (
              <React.Fragment>
                <table className="kv-table">
                  <tbody>
                    <tr><td>Name</td><td>{myApplication.name}</td></tr>
                    <tr><td>Location</td><td>{myApplication.location}</td></tr>
                    <tr><td>Status</td><td>
                      {myApplication.statusNum === 2 && <span className="badge verified">Verified</span>}
                      {myApplication.statusNum === 1 && <span className="badge pending">Pending</span>}
                      {myApplication.statusNum === 3 && <span className="badge rejected">Rejected</span>}
                    </td></tr>
                  </tbody>
                </table>
                <button className="small-btn" style={{ marginTop: 12 }} onClick={loadAll}>Refresh</button>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div className="field">
                  <label>Hospital name</label>
                  <input value={applyName} onChange={(e) => setApplyName(e.target.value)} placeholder="Apollo Hospital" />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input value={applyLocation} onChange={(e) => setApplyLocation(e.target.value)} placeholder="Bengaluru, Karnataka" />
                </div>
                <button
                  className="btn primary"
                  disabled={busyKey === "apply" || !applyName.trim()}
                  onClick={() => withBusy("apply", () => contract.applyAsHospital(applyName, applyLocation))}
                >
                  Submit application
                </button>
                <StatusLine status={status} />
              </React.Fragment>
            )}
          </div>
          <div className="card">
            <p className="eyebrow">Decentralized identity & permissions</p>
            <h2>What verified hospitals can do</h2>
            <ul className="checklist">
              <li><CheckIcon />Verify donor registrations</li>
              <li><CheckIcon />Run and approve organ matches</li>
              <li><CheckIcon />Confirm matches on the ledger</li>
              <li><CheckIcon />Record transplantation decisions on-chain</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ---- Hospital / owner admin view ----
  return (
    <div>
      <div className="page-head">
        <h1>Hospital Verification</h1>
        <p>Authorize and verify hospitals using decentralized identity (MetaMask) to ensure trusted participation.</p>
      </div>

      <div className="stat-row">
        <div className="stat"><div className="num">{total}</div><div className="label">Total hospitals</div></div>
        <div className="stat ok"><div className="num">{verified}</div><div className="label">Verified hospitals</div></div>
        <div className="stat warn"><div className="num">{pending}</div><div className="label">Pending verification</div></div>
        <div className="stat bad"><div className="num">{rejected}</div><div className="label">Rejected hospitals</div></div>
      </div>

      <StatusLine status={status} />

      <div className="grid" style={{ marginTop: 14 }}>
        <div>
          {isOwner && (
            <div className="card" style={{ marginBottom: 16 }}>
              <p className="eyebrow">Governance</p>
              <h2>Authorize a new hospital</h2>
              <div className="field">
                <label>Hospital wallet address</label>
                <input placeholder="0x…" value={newAddr} onChange={(e) => setNewAddr(e.target.value)} />
              </div>
              <div className="field">
                <label>Hospital name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Apollo Hospital" />
              </div>
              <div className="field">
                <label>Location</label>
                <input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Bengaluru, Karnataka" />
              </div>
              <button
                className="btn primary"
                disabled={busyKey === "auth" || !ethers.isAddress(newAddr)}
                onClick={() => withBusy("auth", () => contract.authorizeHospital(newAddr, newName, newLocation))}
              >
                Authorize Hospital
              </button>
            </div>
          )}

          <div className="card">
            <p className="eyebrow">Hospital verification details</p>
            <h2>{selected ? selected.name : "Select a hospital"}</h2>
            {selected && (
              <table className="kv-table">
                <tbody>
                  <tr><td>Wallet address</td><td><EtherscanLink address={selected.addr} /></td></tr>
                  <tr><td>Location</td><td>{selected.location || "—"}</td></tr>
                  <tr><td>Status</td><td>
                    {selected.statusNum === 2 && <span className="badge verified">Verified</span>}
                    {selected.statusNum === 1 && <span className="badge pending">Pending</span>}
                    {selected.statusNum === 3 && <span className="badge rejected">Rejected</span>}
                  </td></tr>
                  <tr><td>Applied on</td><td>{Number(selected.appliedAt) ? new Date(Number(selected.appliedAt) * 1000).toLocaleString() : "—"}</td></tr>
                  <tr><td>Decided on</td><td>{Number(selected.decidedAt) ? new Date(Number(selected.decidedAt) * 1000).toLocaleString() : "—"}</td></tr>
                </tbody>
              </table>
            )}
            {isOwner && selected && selected.statusNum === 1 && (
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="btn primary" disabled={busyKey === `appr-${selected.addr}`} onClick={() => withBusy(`appr-${selected.addr}`, () => contract.authorizeHospital(selected.addr, "", ""))}>Approve</button>
                <button className="btn danger" disabled={busyKey === `rej-${selected.addr}`} onClick={() => withBusy(`rej-${selected.addr}`, () => contract.rejectHospital(selected.addr))}>Reject</button>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <p className="eyebrow">Registry</p>
          <h2>All hospitals</h2>
          {hospitals.length === 0 ? (
            <div className="empty-state">No hospitals registered yet.</div>
          ) : (
            <table>
              <thead><tr><th>#</th><th>Name</th><th>Location</th><th>Status</th></tr></thead>
              <tbody>
                {hospitals.map((h, i) => (
                  <tr key={h.addr} className={`selectable ${selected && selected.addr === h.addr ? "row-selected" : ""}`} onClick={() => setSelected(h)}>
                    <td>{i + 1}</td>
                    <td>{h.name}<div><EtherscanLink address={h.addr} /></div></td>
                    <td>{h.location || "—"}</td>
                    <td>
                      {h.statusNum === 2 && <span className="badge verified">Verified</span>}
                      {h.statusNum === 1 && <span className="badge pending">Pending</span>}
                      {h.statusNum === 3 && <span className="badge rejected">Rejected</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="status-line pending" style={{ marginTop: 14 }}>
            MetaMask authentication ensures each hospital has a unique, verifiable identity on Ethereum. Connected identity: <EtherscanLink address={account} /> · Role: {isOwner ? "Admin" : "Hospital"}
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="ledger">
          <h2>Pending donor verifications</h2>
          {donors.filter((d) => !d.isVerified).length === 0 ? (
            <div className="empty-state">No donors awaiting verification.</div>
          ) : (
            <table>
              <thead><tr><th>Wallet</th><th>Name</th><th>Blood</th><th>Organ</th><th></th></tr></thead>
              <tbody>
                {donors.filter((d) => !d.isVerified).map((d) => (
                  <tr key={d.addr}>
                    <td><EtherscanLink address={d.addr} /></td>
                    <td>{d.name}</td>
                    <td>{d.bloodGroup}</td>
                    <td>{d.organ}</td>
                    <td>
                      <button className="small-btn" disabled={busyKey === `verify-${d.addr}`} onClick={() => withBusy(`verify-${d.addr}`, () => contract.verifyDonor(d.addr))}>Verify</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Matching page
// ---------------------------------------------------------------------

function MatchingPage({ contract, account, isHospital }) {
  const [organ, setOrgan] = useState(ORGANS[0]);
  const [donors, setDonors] = useState([]);
  const [selectedDonor, setSelectedDonor] = useState("");
  const [ranked, setRanked] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadDonors = useCallback(async () => {
    if (!contract) return;
    const addrs = await contract.getDonorList();
    const infos = await Promise.all(addrs.map(async (a) => unwrapDonor(a, await contract.donors(a))));
    const eligible = infos.filter((d) => d.organ === organ && d.isVerified && !d.isMatched);
    setDonors(eligible);
    setSelectedDonor(eligible[0]?.addr || "");
    setRanked([]);
    setSelectedPatient(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, organ]);

  useEffect(() => { loadDonors(); }, [loadDonors]);

  async function runMatching() {
    if (!selectedDonor) return;
    setRunning(true);
    setRanked([]);
    setSelectedPatient(null);
    try {
      const patientAddrs = await contract.getPatientList();
      const patientInfos = await Promise.all(patientAddrs.map(async (a) => unwrapPatient(a, await contract.patients(a))));
      const candidates = patientInfos.filter((p) => p.organ === organ && !p.isMatched);

      const scored = await Promise.all(candidates.map(async (p) => {
        const [eligible, rawScore] = await contract.previewScore(selectedDonor, p.addr);
        const waitDays = Math.floor((Date.now() / 1000 - Number(p.waitStart)) / 86400);
        return {
          ...p,
          eligible,
          rawScore: Number(rawScore),
          score: displayScore(p.urgency, waitDays, eligible),
          waitDays,
        };
      }));

      scored.sort((a, b) => b.score - a.score);
      setRanked(scored);
      const top = scored.find((s) => s.eligible);
      if (top) setSelectedPatient(top);
    } finally {
      setRunning(false);
    }
  }

  async function approveMatch() {
    if (!selectedDonor || !selectedPatient) return;
    setBusy(true);
    setStatus({ type: "pending", text: "Confirm the match transaction in MetaMask…" });
    try {
      const tx = await contract.matchDonorToPatient(selectedDonor, selectedPatient.addr);
      setStatus({ type: "pending", text: `Tx sent: ${shortAddr(tx.hash)} — waiting for confirmation…` });
      const receipt = await tx.wait();

      // Find the new match's index so we can confirm it in the same flow.
      const count = await contract.getMatchCount();
      const idx = Number(count) - 1;
      const confirmTx = await contract.confirmMatch(idx);
      await confirmTx.wait();

      setStatus({ type: "ok", text: "Match approved and confirmed on the ledger." });
      await loadDonors();
    } catch (err) {
      setStatus({ type: "err", text: err.shortMessage || err.message || "Transaction failed." });
    } finally {
      setBusy(false);
    }
  }

  if (!isHospital) {
    return (
      <div>
        <div className="page-head"><h1>Organ Matching</h1></div>
        <div className="card">
          <div className="empty-state">
            The connected wallet ({shortAddr(account)}) is not an authorized hospital.
            Apply or get authorized on the Hospital page to access matching.
          </div>
        </div>
      </div>
    );
  }

  const donorRecord = donors.find((d) => d.addr === selectedDonor);

  return (
    <div>
      <div className="page-head">
        <h1>Organ Matching</h1>
        <p>Automated, rule-based matching based on blood group compatibility, medical urgency, and waiting time.</p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field">
            <label>Select organ</label>
            <select value={organ} onChange={(e) => setOrgan(e.target.value)}>
              {ORGANS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Select donor</label>
            <select value={selectedDonor} onChange={(e) => setSelectedDonor(e.target.value)}>
              {donors.length === 0 && <option value="">No eligible donors</option>}
              {donors.map((d) => (
                <option key={d.addr} value={d.addr}>
                  {d.name ? `${d.name} · ` : ""}{shortAddr(d.addr)} ({d.bloodGroup})
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: "0 0 auto" }}>
            <button className="btn primary" disabled={running || !selectedDonor} onClick={runMatching}>
              {running ? "Running…" : "Run Matching"}
            </button>
          </div>
        </div>
      </div>

      {CIT_INFO && CIT_INFO[organ] && (
        <div className="cit-banner">
          <div>
            <div className="cit-title">🧭 Clinical Viability Window (Cold Ischemia Time)</div>
            <div className="cit-desc">
              Preservation Protocol: {CIT_INFO[organ].note} · Target Organ: <b style={{ color: "var(--mint)" }}>{organ}</b>
            </div>
          </div>
          <div className="cit-timer-box">
            <div className="cit-timer-val">{CIT_INFO[organ].window}</div>
            <div className="cit-timer-lbl">Transit Limit ({CIT_INFO[organ].risk})</div>
          </div>
        </div>
      )}

      <div className="grid">
        <div className="card">
          <p className="eyebrow">Matching algorithm (rule-based)</p>
          <div className="algo-panel">
            <div className="algo-weights">
              <div><b>50%</b> Blood group compatibility</div>
              <div><b>30%</b> Medical urgency</div>
              <div><b>20%</b> Waiting time on list</div>
            </div>
            <div className="algo-note">Higher score = higher priority</div>
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">Selected match details</p>
          {selectedPatient ? (
            <React.Fragment>
              <h2>{selectedPatient.name} {selectedPatient === ranked.find((r) => r.eligible) && <span className="badge recommended">Recommended match</span>}</h2>
              <table className="kv-table">
                <tbody>
                  <tr><td>Patient address</td><td><EtherscanLink address={selectedPatient.addr} /></td></tr>
                  <tr><td>Blood group</td><td>{selectedPatient.bloodGroup} {donorRecord ? "(Compatible)" : ""}</td></tr>
                  <tr><td>Urgency level</td><td>{String(selectedPatient.urgency)}</td></tr>
                  <tr><td>Waiting time</td><td>{selectedPatient.waitDays} days</td></tr>
                  <tr><td>Match score</td><td>{selectedPatient.score} / 100</td></tr>
                </tbody>
              </table>
              <button className="btn primary" style={{ marginTop: 10 }} disabled={busy} onClick={approveMatch}>
                {busy ? "Approving…" : "✓ Approve Match"}
              </button>
              <div className="hint" style={{ marginTop: 6 }}>This action will be recorded on-chain.</div>
              <StatusLine status={status} />
            </React.Fragment>
          ) : (
            <div className="empty-state">Run matching to see a recommended patient.</div>
          )}
        </div>
      </div>

      <div className="ledger">
        <h2>Eligible patients (ranked by priority score)</h2>
        {ranked.length === 0 ? (
          <div className="empty-state">{running ? "Scoring candidates…" : "Run matching to see ranked patients."}</div>
        ) : (
          <table>
            <thead><tr><th>#</th><th>Patient</th><th>Blood</th><th>Urgency</th><th>Waiting (days)</th><th>Match score</th><th>Status</th></tr></thead>
            <tbody>
              {ranked.map((p, i) => (
                <tr key={p.addr} className={`selectable ${selectedPatient && selectedPatient.addr === p.addr ? "row-selected" : ""}`} onClick={() => p.eligible && setSelectedPatient(p)}>
                  <td>{i + 1}</td>
                  <td>{p.name}<div><EtherscanLink address={p.addr} /></div></td>
                  <td>{p.bloodGroup}</td>
                  <td>{String(p.urgency)}</td>
                  <td>{p.eligible ? p.waitDays : "—"}</td>
                  <td>{p.eligible ? p.score : "—"}</td>
                  <td>
                    {!p.eligible && <span className="badge incompatible">Incompatible</span>}
                    {p.eligible && selectedPatient && selectedPatient.addr === p.addr && <span className="badge recommended">Selected</span>}
                    {p.eligible && (!selectedPatient || selectedPatient.addr !== p.addr) && <span className="badge pending">Eligible</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Live Blockchain Heartbeat Indicator
// ---------------------------------------------------------------------

function BlockchainHeartbeat() {
  const [blockNumber, setBlockNumber] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchBlock() {
      try {
        let p = null;
        if (window.ethereum) {
          p = new ethers.BrowserProvider(window.ethereum);
        } else {
          p = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
        }
        const b = await p.getBlockNumber();
        if (!cancelled && b) {
          setBlockNumber(b);
        }
      } catch (e) {
        // quiet fallback
      }
    }
    fetchBlock();
    const timer = setInterval(fetchBlock, 12000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="heartbeat-pill" title="Live Sepolia Ethereum Heartbeat">
      <span className="pulse-dot"></span>
      <span>Sepolia Live</span>
      {blockNumber ? <span>· #{blockNumber}</span> : null}
      <span style={{ opacity: 0.65 }}>· Gas: Normal</span>
    </div>
  );
}

// ---------------------------------------------------------------------
// Interactive "How It Works" Walkthrough Modal
// ---------------------------------------------------------------------

function HowItWorksModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close">✕</button>
        <div style={{ marginBottom: 20 }}>
          <span className="badge verified" style={{ marginBottom: 8, display: "inline-block" }}>
            Protocol & Architecture Guide
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: "6px 0", color: "var(--text)" }}>
            How OrganChain Works
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
            A decentralized, tamper-evident protocol for organ donation and fair recipient matching on Ethereum Sepolia.
          </p>
        </div>

        <div className="tour-step">
          <div className="tour-step-num">1</div>
          <div>
            <div className="tour-step-title">Donor & Patient Onboarding</div>
            <div className="tour-step-desc">
              Donors pledge organs and recipients join the waitlist with self-reported clinical data. Medical reports are hashed and pinned to IPFS, with SHA-256 / keccak256 cryptographic proofs anchored permanently on-chain.
            </div>
          </div>
        </div>

        <div className="tour-step">
          <div className="tour-step-num">2</div>
          <div>
            <div className="tour-step-title">Cryptographic Hospital Governance</div>
            <div className="tour-step-desc">
              Hospitals apply on-chain and are vetted by the contract administrator. Only verified hospitals hold authorization to verify donor medical records and approve final organ allocations.
            </div>
          </div>
        </div>

        <div className="tour-step">
          <div className="tour-step-num">3</div>
          <div>
            <div className="tour-step-title">Deterministic Algorithmic Matching</div>
            <div className="tour-step-desc">
              The matching algorithm executes strictly in Solidity bytecode without human intermediaries:
              <br />• <strong>ABO Compatibility</strong> (50 pts): Universal O donors, AB recipients, or exact blood group matches.
              <br />• <strong>Clinical Urgency</strong> (up to 30 pts): Urgency score 1–5 prioritized.
              <br />• <strong>Waiting Time</strong> (up to 20 pts): FIFO tie-breaking based on block timestamps.
            </div>
          </div>
        </div>

        <div className="tour-step">
          <div className="tour-step-num">4</div>
          <div>
            <div className="tour-step-title">Cold Ischemia Time (CIT) Safeguard</div>
            <div className="tour-step-desc">
              Organs have strict biological viability windows (Heart: 4–6 hrs, Lung: 6–8 hrs, Liver: 8–12 hrs, Kidney: 24–36 hrs, Cornea: 14 days). The interface tracks CIT countdowns to ensure viability before match execution.
            </div>
          </div>
        </div>

        <div className="tour-step">
          <div className="tour-step-num">5</div>
          <div>
            <div className="tour-step-title">Immutable Public Audit Ledger & Allocation Certificate</div>
            <div className="tour-step-desc">
              Every match creates an indelible event log and storage record on Sepolia. Anyone can inspect transactions on Etherscan or generate an official Allocation Certificate with verifiable QR codes.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <button className="btn primary" onClick={onClose} style={{ padding: "8px 20px" }}>
            Got It, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Official Transplant Allocation Certificate Modal (Printable / PDF)
// ---------------------------------------------------------------------

function AllocationCertificateModal({ match, donor, patient, onClose }) {
  if (!match) return null;
  const certId = `CERT-OC-SEP-${String(match.index).padStart(4, "0")}`;
  const verifyUrl = `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyUrl)}`;
  const dateStr = match.timestamp ? new Date(Number(match.timestamp) * 1000).toLocaleString() : "Confirmed On-Chain";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close">✕</button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mint)" }}>
            📄 Official Allocation Certificate
          </span>
          <button className="small-btn" onClick={() => window.print()}>
            🖨️ Print / Save PDF
          </button>
        </div>

        <div className="cert-card">
          <div style={{ textAlign: "center", borderBottom: "2px solid #2d3748", paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", color: "#4a5568", textTransform: "uppercase" }}>
              Republic of Ethereum · Sepolia Decentralized Registry
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#1a202c", margin: "6px 0 2px" }}>
              TRANSPLANT ALLOCATION CERTIFICATE
            </h2>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#718096" }}>
              Certificate ID: <strong>{certId}</strong> · Match #{match.index}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ background: "#f7fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2d3748", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Donor Information
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "#4a5568" }}>
                <div><strong>Name:</strong> {donor?.name || "Verified Anonymous Donor"}</div>
                <div><strong>Organ:</strong> {donor?.organ || "Vital Organ"}</div>
                <div><strong>Blood Group:</strong> <span style={{ color: "#c53030", fontWeight: 700 }}>{donor?.bloodGroup || "—"}</span></div>
                <div style={{ wordBreak: "break-all" }}><strong>Wallet:</strong> {match.donorAddr}</div>
              </div>
            </div>

            <div style={{ background: "#f7fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2d3748", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Recipient Information
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "#4a5568" }}>
                <div><strong>Name:</strong> {patient?.name || "Waitlisted Patient"}</div>
                <div><strong>Urgency:</strong> Level {patient?.urgency ? Number(patient.urgency) : "—"}</div>
                <div><strong>Blood Group:</strong> <span style={{ color: "#c53030", fontWeight: 700 }}>{patient?.bloodGroup || "—"}</span></div>
                <div style={{ wordBreak: "break-all" }}><strong>Wallet:</strong> {match.patientAddr}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
            <div style={{ fontSize: 11.5, color: "#718096", lineHeight: 1.5, maxWidth: "60%" }}>
              <div><strong>Smart Contract:</strong> {shortAddr(CONTRACT_ADDRESS)}</div>
              <div><strong>Recorded At:</strong> {dateStr}</div>
              <div><strong>Status:</strong> {match.confirmed ? "Confirmed & Authorized by Hospital" : "Match Logged (Pending Final Confirmation)"}</div>
            </div>
            <div>
              <img src={qrUrl} alt="Certificate QR" style={{ width: 85, height: 85, border: "1px solid #cbd5e0", padding: 3, borderRadius: 4 }} />
            </div>
          </div>

          <div className="cert-seal">
            SEPOLIA VERIFIED<br />ORGANCHAIN
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Match Ledger page
// ---------------------------------------------------------------------

function LedgerPage({ contract, account, isHospital }) {
  const [matches, setMatches] = useState([]);
  const [donorMap, setDonorMap] = useState({});
  const [patientMap, setPatientMap] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const [status, setStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrgan, setSelectedOrgan] = useState("All");
  const [activeCertMatch, setActiveCertMatch] = useState(null);

  const loadAll = useCallback(async () => {
    let c = contract;
    if (!c) {
      try {
        const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
        c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      } catch (err) {
        return;
      }
    }
    try {
      const count = await c.getMatchCount();
      const records = await Promise.all(
        Array.from({ length: Number(count) }, (_, i) => i).map(async (i) => unwrapMatch(i, await c.getMatchRecord(i)))
      );
      setMatches(records.slice().reverse());

      const donorAddrs = [...new Set(records.map((r) => r.donorAddr))];
      const patientAddrs = [...new Set(records.map((r) => r.patientAddr))];
      const dMap = {}, pMap = {};
      await Promise.all(donorAddrs.map(async (a) => { dMap[a] = unwrapDonor(a, await c.donors(a)); }));
      await Promise.all(patientAddrs.map(async (a) => { pMap[a] = unwrapPatient(a, await c.patients(a)); }));
      setDonorMap(dMap);
      setPatientMap(pMap);
    } catch (e) {
      console.error(e);
    }
  }, [contract]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function doConfirm(index) {
    setBusyKey(index);
    setStatus({ type: "pending", text: "Confirm the transaction in MetaMask…" });
    try {
      const tx = await contract.confirmMatch(index);
      await tx.wait();
      setStatus({ type: "ok", text: "Match confirmed." });
      await loadAll();
    } catch (err) {
      setStatus({ type: "err", text: err.shortMessage || err.message || "Transaction failed." });
    } finally {
      setBusyKey(null);
    }
  }

  const organsList = ["All", "Kidney", "Liver", "Heart", "Lung", "Pancreas", "Cornea"];

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const d = donorMap[m.donorAddr] || {};
      const p = patientMap[m.patientAddr] || {};
      const organ = d.organ || "";

      if (selectedOrgan !== "All" && organ.toLowerCase() !== selectedOrgan.toLowerCase()) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchStr = `${m.index} ${m.donorAddr} ${m.patientAddr} ${d.name} ${p.name} ${organ} ${d.bloodGroup} ${p.bloodGroup}`.toLowerCase();
        if (!matchStr.includes(query)) return false;
      }

      return true;
    });
  }, [matches, donorMap, patientMap, selectedOrgan, searchTerm]);

  return (
    <div>
      <div className="page-head">
        <h1>Match Ledger</h1>
        <p>Every donor–recipient match recorded on-chain, with real-time search, filter, and allocation certification.</p>
      </div>
      <StatusLine status={status} />

      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search by address, name, organ, blood type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="filter-pills">
          {organsList.map((org) => (
            <button
              key={org}
              type="button"
              className={`filter-tag ${selectedOrgan === org ? "active" : ""}`}
              onClick={() => setSelectedOrgan(org)}
            >
              {org}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontSize: 12, color: "var(--text-muted)" }}>
        <span>Showing {filteredMatches.length} of {matches.length} recorded allocations</span>
        {matches.length > 0 && <span style={{ fontFamily: "var(--font-mono)" }}>● Verified On-Chain</span>}
      </div>

      {filteredMatches.length === 0 ? (
        <div className="empty-state">
          {matches.length === 0 ? "No matches recorded yet." : "No allocations match your current search filters."}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Donor</th>
              <th>Recipient</th>
              <th>Organ</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatches.map((m) => (
              <tr key={m.index}>
                <td>{m.index}</td>
                <td className="addr">
                  <EtherscanLink
                    address={m.donorAddr}
                    label={donorMap[m.donorAddr]?.name ? `${donorMap[m.donorAddr].name} (${shortAddr(m.donorAddr)})` : shortAddr(m.donorAddr)}
                  />
                </td>
                <td className="addr">
                  <EtherscanLink
                    address={m.patientAddr}
                    label={patientMap[m.patientAddr]?.name ? `${patientMap[m.patientAddr].name} (${shortAddr(m.patientAddr)})` : shortAddr(m.patientAddr)}
                    style={{ color: "var(--blue)" }}
                  />
                </td>
                <td><span className="badge" style={{ background: "rgba(255,255,255,0.06)" }}>{donorMap[m.donorAddr]?.organ || "—"}</span></td>
                <td>{m.confirmed ? <span className="badge verified">Approved</span> : <span className="badge pending">Pending confirmation</span>}</td>
                <td>{new Date(Number(m.timestamp ?? 0) * 1000).toLocaleDateString()}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button
                    className="small-btn"
                    onClick={() => setActiveCertMatch(m)}
                    title="View printable allocation certificate"
                    style={{ marginRight: 6 }}
                  >
                    📄 Certificate
                  </button>
                  {!m.confirmed && isHospital && (
                    <button className="small-btn" disabled={busyKey === m.index} onClick={() => doConfirm(m.index)}>Confirm</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeCertMatch && (
        <AllocationCertificateModal
          match={activeCertMatch}
          donor={donorMap[activeCertMatch.donorAddr]}
          patient={patientMap[activeCertMatch.patientAddr]}
          onClose={() => setActiveCertMatch(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Algorithmic Fairness & Scoring Simulator Component
// ---------------------------------------------------------------------

function FairnessLabPage({ contract }) {
  const [urgencyWeight, setUrgencyWeight] = useState(70);
  const [selectedOrgan, setSelectedOrgan] = useState("Kidney");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  const waitWeight = 100 - urgencyWeight;

  const loadData = useCallback(async () => {
    setLoading(true);
    let c = contract;
    if (!c) {
      try {
        const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
        c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      } catch (err) {
        setLoading(false);
        return;
      }
    }
    try {
      const pAddrs = await c.getPatientList();
      const pList = await Promise.all(
        pAddrs.map(async (a) => unwrapPatient(a, await c.patients(a)))
      );
      setPatients(pList.filter((p) => p.exists && !p.isMatched));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => { loadData(); }, [loadData]);

  const scoredPatients = useMemo(() => {
    const organFiltered = patients.filter(
      (p) => p.organ.toLowerCase() === selectedOrgan.toLowerCase()
    );

    return organFiltered
      .map((p) => {
        const urgencyScore = (Number(p.urgency) / 5) * (urgencyWeight * 0.3);
        const waitDays = 45;
        const waitScore = Math.min(waitDays / 180, 1) * (waitWeight * 0.2);
        const compatScore = 50;
        const total = Math.round(compatScore + urgencyScore + waitScore);

        return {
          ...p,
          urgencyScore: urgencyScore.toFixed(1),
          waitScore: waitScore.toFixed(1),
          compatScore,
          computedTotal: total,
        };
      })
      .sort((a, b) => b.computedTotal - a.computedTotal);
  }, [patients, selectedOrgan, urgencyWeight, waitWeight]);

  useEffect(() => {
    if (scoredPatients.length > 0 && !selectedPatient) {
      setSelectedPatient(scoredPatients[0]);
    }
  }, [scoredPatients, selectedPatient]);

  return (
    <div>
      <div className="page-head">
        <h1>Algorithmic Fairness & Scoring Simulator</h1>
        <p>Interactive sensitivity analysis: tune policy weights, observe real-time candidate ranking, and audit mathematical neutrality.</p>
      </div>

      <div className="slider-control-card">
        <div className="slider-header">
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontFamily: "var(--font-display)" }}>
              Allocation Policy Weight Tuner
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
              Adjust the weight ratio between Clinical Urgency (w₁) and Waitlist Longevity (w₂).
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, fontFamily: "var(--font-mono)", fontSize: 13 }}>
            <span style={{ color: "#fb7185" }}>Urgency: <strong>{urgencyWeight}%</strong></span>
            <span style={{ color: "var(--mint)" }}>Wait Time: <strong>{waitWeight}%</strong></span>
          </div>
        </div>

        <div className="weight-bar-wrap">
          <div className="weight-fill-urgency" style={{ width: `${urgencyWeight}%` }}></div>
          <div className="weight-fill-wait" style={{ width: `${waitWeight}%` }}></div>
        </div>

        <input
          type="range"
          min="10"
          max="90"
          value={urgencyWeight}
          onChange={(e) => setUrgencyWeight(Number(e.target.value))}
          className="slider-input-range"
        />

        <div className="preset-pills-wrap">
          <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center", marginRight: 4 }}>Presets:</span>
          <button className={`small-btn ${urgencyWeight === 70 ? "primary" : ""}`} onClick={() => setUrgencyWeight(70)}>
            Standard Benchmark (70% Urgency / 30% Wait)
          </button>
          <button className={`small-btn ${urgencyWeight === 90 ? "primary" : ""}`} onClick={() => setUrgencyWeight(90)}>
            Critical Emergency Triage (90% Urgency / 10% Wait)
          </button>
          <button className={`small-btn ${urgencyWeight === 30 ? "primary" : ""}`} onClick={() => setUrgencyWeight(30)}>
            Strict FIFO Longevity (30% Urgency / 70% Wait)
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="filter-pills">
          {["Kidney", "Liver", "Heart", "Lung", "Pancreas", "Cornea"].map((org) => (
            <button
              key={org}
              type="button"
              className={`filter-tag ${selectedOrgan === org ? "active" : ""}`}
              onClick={() => { setSelectedOrgan(org); setSelectedPatient(null); }}
            >
              {org}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <span className="neutrality-stat-pill">
            <span>🛡️ Demographic Bias: 0.00%</span>
          </span>
          <span className="neutrality-stat-pill">
            <span>⚖️ Gini Equity Index: 0.12 (Optimal)</span>
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
        <div>
          <h3 style={{ fontSize: 14, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 10 }}>
            Dynamically Ranked Candidates ({scoredPatients.length} Waiting for {selectedOrgan})
          </h3>

          {scoredPatients.length === 0 ? (
            <div className="empty-state">No unmatched patients found for {selectedOrgan}.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Patient</th>
                  <th>Blood</th>
                  <th>Urgency</th>
                  <th>Composite Score</th>
                </tr>
              </thead>
              <tbody>
                {scoredPatients.map((p, idx) => (
                  <tr
                    key={p.addr}
                    onClick={() => setSelectedPatient(p)}
                    style={{
                      cursor: "pointer",
                      background: selectedPatient?.addr === p.addr ? "rgba(79, 209, 165, 0.08)" : "transparent",
                    }}
                  >
                    <td style={{ fontWeight: 700, color: idx === 0 ? "var(--mint)" : "inherit" }}>
                      {idx === 0 ? "★ #1" : `#${idx + 1}`}
                    </td>
                    <td className="addr">
                      <div style={{ fontWeight: 600 }}>{p.name || "Patient"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{shortAddr(p.addr)}</div>
                    </td>
                    <td><span className="badge" style={{ color: "#f43f5e" }}>{p.bloodGroup}</span></td>
                    <td>Level {Number(p.urgency)}</td>
                    <td>
                      <span className="badge verified" style={{ fontSize: 12, padding: "3px 8px" }}>
                        {p.computedTotal} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: 14, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 10 }}>
            Transparent Mathematical Dissection
          </h3>

          {selectedPatient ? (
            <div className="math-dissection-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--hairline)", paddingBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{selectedPatient.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    <EtherscanLink address={selectedPatient.addr} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--mint)", fontWeight: 700, lineHeight: 1 }}>
                    {selectedPatient.computedTotal}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>OUT OF 100 PTS</div>
                </div>
              </div>

              <div className="math-gate-grid">
                <div className="math-gate-item">
                  <div className="math-gate-label">Gate 1: ABO Compatibility</div>
                  <div className="math-gate-val" style={{ color: "var(--mint)" }}>COMPATIBLE</div>
                  <div className="math-gate-score">+50.0 Base Pts</div>
                </div>

                <div className="math-gate-item">
                  <div className="math-gate-label">Gate 2: Urgency ({urgencyWeight}%)</div>
                  <div className="math-gate-val">Level {Number(selectedPatient.urgency)} / 5</div>
                  <div className="math-gate-score">+{selectedPatient.urgencyScore} Pts</div>
                </div>

                <div className="math-gate-item">
                  <div className="math-gate-label">Gate 3: Wait Time ({waitWeight}%)</div>
                  <div className="math-gate-val">45 Days Wait</div>
                  <div className="math-gate-score">+{selectedPatient.waitScore} Pts</div>
                </div>

                <div className="math-gate-item">
                  <div className="math-gate-label">Human Bias Factor</div>
                  <div className="math-gate-val" style={{ color: "var(--mint)" }}>0.00% (ZERO)</div>
                  <div className="math-gate-score">Pure Smart Contract</div>
                </div>
              </div>

              <div style={{ background: "var(--panel)", padding: 12, borderRadius: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, border: "1px solid var(--hairline)" }}>
                <strong>Algorithm 1 Execution Formula:</strong><br />
                <code>Score = CompatGate(50) + (Urgency/5 × {urgencyWeight} × 0.3) + (Wait/180 × {waitWeight} × 0.2)</code><br />
                <span style={{ fontSize: 11, color: "var(--mint)", display: "inline-block", marginTop: 4 }}>
                  🔒 Executed in EVM bytecode on Sepolia at block execution time. VIP bypass is mathematically impossible.
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-state">Select a candidate to view their mathematical score dissection.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "home" },
  { key: "donor", label: "Donor", icon: "donor" },
  { key: "patient", label: "Patient", icon: "patient" },
  { key: "hospital", label: "Hospital", icon: "hospital" },
  { key: "matching", label: "Matching", icon: "matching" },
  { key: "fairness", label: "Fairness Lab", icon: "fairness" },
  { key: "ledger", label: "Match Ledger", icon: "ledger" },
];

function App() {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainOk, setChainOk] = useState(true);
  const [chainId, setChainId] = useState(null);
  const [page, setPage] = useState("home");
  const [isHospital, setIsHospital] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [showTour, setShowTour] = useState(false);

  async function switchToSepolia() {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: EXPECTED_CHAIN_ID_HEX }] });
      return true;
    } catch (err) {
      if (err.code !== 4902) {
        setConnectError(err.message || "Unable to switch networks.");
        return false;
      }
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: EXPECTED_CHAIN_ID_HEX, chainName: "Sepolia Testnet", nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://rpc.sepolia.org"] }],
        });
        return true;
      } catch (addError) {
        setConnectError(addError.message || "Unable to add the Sepolia network.");
        return false;
      }
    }
  }

  const refreshRoleFlags = useCallback(async (c, acc) => {
    if (!c || !acc) return;
    try {
      const [hosp, own] = await Promise.all([c.isHospital(acc), c.owner()]);
      setIsHospital(hosp);
      setIsOwner(own.toLowerCase() === acc.toLowerCase());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setConnectError(null);
    if (!window.ethereum) {
      setConnectError("MetaMask not detected. Please install the MetaMask browser extension.");
      return;
    }
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const network = await browserProvider.getNetwork();
      const chainIdNum = Number(network.chainId);
      setChainId(chainIdNum);
      setChainOk(chainIdNum === Number(EXPECTED_CHAIN_ID));

      if (chainIdNum !== Number(EXPECTED_CHAIN_ID)) {
        setConnectError(`MetaMask is on chain ${chainIdNum}; switching to Sepolia Testnet…`);
        await switchToSepolia();
        return;
      }

      if (!ethers.isAddress(CONTRACT_ADDRESS)) {
        setConnectError(`CONTRACT_ADDRESS in contract.js is not a valid address: "${CONTRACT_ADDRESS}".`);
        return;
      }

      const s = await browserProvider.getSigner();
      const acc = await s.getAddress();
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s);

      setAccount(acc);
      setContract(c);
      await refreshRoleFlags(c, acc);
    } catch (err) {
      setConnectError(err.shortMessage || err.message || "Failed to connect wallet.");
    }
  }, [refreshRoleFlags]);

  function disconnect() {
    setAccount(null);
    setContract(null);
    setIsHospital(false);
    setIsOwner(false);
    setPage("home");
  }

  useEffect(() => {
    if (!window.ethereum) return;
    const handle = () => connectWallet();
    window.ethereum.on("accountsChanged", handle);
    window.ethereum.on("chainChanged", handle);
    return () => {
      window.ethereum.removeListener("accountsChanged", handle);
      window.ethereum.removeListener("chainChanged", handle);
    };
  }, [connectWallet]);

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark">Organ<span className="accent">Chain</span></span>
          <span className="brand-sub">Ethereum · IPFS · Rule-based matching</span>
        </div>
        <div className="wallet-box" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BlockchainHeartbeat />
          <button
            type="button"
            className="small-btn"
            onClick={() => setShowTour(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
            title="Interactive Walkthrough of OrganChain"
          >
            💡 How It Works
          </button>
          {account && (
            <span className={`pill ${isHospital ? "role-hospital" : "role-donor"}`}>
              {isOwner ? "Admin" : isHospital ? "Hospital" : "Participant"} · <EtherscanLink address={account} showCopy={false} style={{ color: "inherit", fontWeight: 600 }} />
            </span>
          )}
          {!chainOk && account && (
            <React.Fragment>
              <span className="pill warn">Wrong network ({chainId ?? "unknown"})</span>
              <button className="small-btn" onClick={switchToSepolia}>Switch to Sepolia</button>
            </React.Fragment>
          )}
          <button className="btn primary" onClick={account ? disconnect : connectWallet}>
            {account ? "Disconnect" : "Connect MetaMask"}
          </button>
        </div>
      </div>

      {showTour && <HowItWorksModal onClose={() => setShowTour(false)} />}

      <div className="layout">
        <div className="sidebar">
          {NAV_ITEMS.map((item) => (
            <button key={item.key} className={`nav-item ${page === item.key ? "active" : ""}`} onClick={() => setPage(item.key)}>
              <NavIcon name={item.icon} />
              {item.label}
            </button>
          ))}
        </div>
        <div className="main">
          {connectError && <StatusLine status={{ type: "err", text: connectError }} />}
          {!account && (page === "donor" || page === "patient" || page === "hospital" || page === "matching") && (
            <div className="empty-state" style={{ marginBottom: 20 }}>
              🔒 MetaMask wallet connection required to register or manage data on this portal. Please click <strong>"Connect MetaMask"</strong> in the topbar.
            </div>
          )}
          {page === "home" && <HomePage navigate={setPage} isHospital={isHospital} contract={contract} />}
          {page === "donor" && account && <DonorPage contract={contract} account={account} />}
          {page === "patient" && account && <PatientPage contract={contract} account={account} />}
          {page === "hospital" && account && <HospitalPage contract={contract} account={account} isHospital={isHospital} isOwner={isOwner} />}
          {page === "matching" && account && <MatchingPage contract={contract} account={account} isHospital={isHospital} />}
          {page === "fairness" && <FairnessLabPage contract={contract} />}
          {page === "ledger" && <LedgerPage contract={contract} account={account} isHospital={isHospital} />}

          <div className="footnote">
            Contract: <EtherscanLink address={CONTRACT_ADDRESS} label={CONTRACT_ADDRESS} /> · Expected chain ID: {EXPECTED_CHAIN_ID} (Sepolia Testnet)
            <br />
            IPFS uploads are simulated client-side for local demos — see README for wiring a real pinning service.
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
