// NodeSummary.jsx
import styled from 'styled-components';

const Wrapper = styled.div`
  width: 50%;
  height: 100%;
  overflow: auto;
  padding: 1em;
`;

const Table = styled.div`
  .row { display: flex; padding: .4em 0; border-bottom: 1px solid #eee; }
  .row > div:first-child { width: 40%; font-weight: bold; }
  .row > div:last-child  { width: 60%; }
`;

export default function NodeSummary({ summary }) {
  const renderTree = obj =>
    Object.entries(obj).map(([k, v]) => Array.isArray(v)
      ? <li key={k}>{k}: <a href={`/datanode/${v[0]}`}>{v[0]}</a></li>
      : <li key={k}>{k}: <ul>{renderTree(v)}</ul></li>
    );

  return (
    <Wrapper>
      <h2>Summary</h2>
      <Table>
        {summary.table.map(([k, v]) => (
          <div key={k} className="row">
            <div>{k}</div><div>{String(v)}</div>
          </div>
        ))}
      </Table>

      {/* Only WorkGraph data comes with inputs / outputs */}
      {summary.inputs && (
        <>
          <h3>Inputs</h3>
          <ul>{renderTree(summary.inputs)}</ul>
        </>
      )}
      {summary.outputs && (
        <>
          <h3>Outputs</h3>
          <ul>{renderTree(summary.outputs)}</ul>
        </>
      )}
    </Wrapper>
  );
}
