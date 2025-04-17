// NodeLog – was WorkGraphLog; now works for any kind of node
import styled from 'styled-components';
import { useEffect, useState } from 'react';

const Wrapper = styled.div`
  border: 1px solid #ddd;
  padding: 1em;
  overflow: auto;
  font-family: monospace;
  white-space: pre;
  font-size: 1.2em;
  line-height: 1.4;
  text-align: left;
  color: #444;
`;

export default function NodeLog({ kind, id }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = () =>
      fetch(`http://localhost:8000/api/${kind}-logs/${id}`)
        .then(r => r.json())
        .then(setLogs)
        .catch(err => console.error('Error fetching logs: ', err));

    fetchLogs();                       // immediately
    const i = setInterval(fetchLogs, 4000);   // every 4 s
    return () => clearInterval(i);
  }, [kind, id]);

  return (
    <Wrapper>
      <h3>Log information</h3>
      {logs.map((l, i) => <div key={i}>{l}</div>)}
    </Wrapper>
  );
}
