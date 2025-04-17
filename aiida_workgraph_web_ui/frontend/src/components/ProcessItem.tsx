import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'antd';
import { PageContainer, TopMenu } from './WorkGraphItemStyles'; // you already have these
import WorkGraphSummary from './WorkGraphSummary';
import WorkGraphLog from './WorkGraphLog';

export default function Process() {
  const { pk } = useParams();
  const [view, setView] = useState('Summary');
  const [summary, setSummary] = useState(null);

  /* fetch once */
  useEffect(() => {
    fetch(`http://localhost:8000/api/process/${pk}`)
      .then(r => r.json())
      .then(setSummary);
  }, [pk]);

  return (
    <PageContainer>
      <TopMenu>
        <Button onClick={() => setView('Summary')}>Summary</Button>
        <Button onClick={() => setView('Log')}>Log</Button>
      </TopMenu>

      {view === 'Summary' && summary && <WorkGraphSummary summary={summary} />}
      {view === 'Log'      && <WorkGraphLog id={pk} />}
    </PageContainer>
  );
}
