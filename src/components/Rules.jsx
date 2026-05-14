import React from 'react';

export default function Rules({ rules, setRules }) {
  return (
    <div>
      <h2 className="page-title">Pravila stopenj zrelosti</h2>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Stopnja</th>
              <th>Ime</th>
              <th>Najmanj točk (%)</th>
              <th>Opis</th>
              <th>Dejanja</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.level}>
                <td style={{ fontWeight: 600 }}>{r.level}</td>
                <td><input type="text" className="form-control" defaultValue={r.name} style={{ padding: '5px' }} /></td>
                <td><input type="number" className="form-control" defaultValue={r.minScore} style={{ padding: '5px', width: '70px' }} /></td>
                <td><input type="text" className="form-control" defaultValue={r.description} style={{ padding: '5px' }} /></td>
                <td><button className="btn">Posodobi</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
