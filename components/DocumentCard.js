export default function DocumentCard({ document }) {
  return (
    <div className="document-card">
      <h3>{document.hash}</h3>
      <p>Owner: {document.owner}</p>
      <p>Timestamp: {new Date(document.timestamp * 1000).toLocaleString()}</p>
      <p>Verified: {document.verified ? 'Yes' : 'No'}</p>
    </div>
  );
}