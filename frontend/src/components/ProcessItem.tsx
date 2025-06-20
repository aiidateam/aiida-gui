import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'antd';
import { PageContainer, TopMenu } from './ProcessItemStyles';
import ProcessSummary from './ProcessSummary';
import ProcessLog from './ProcessLog';

export default function Process() {
  const { pk } = useParams();
  const [view, setView] = useState('Summary');
  const [summary, setSummary] = useState(null);

  /* fetch once */
  useEffect(() => {
    fetch(`/api/process/${pk}`)
      .then(r => r.json())
      .then(setSummary);
  }, [pk]);

  return (
    <PageContainer>
      <TopMenu>
        <Button onClick={() => setView('Summary')}>Summary</Button>
        <Button onClick={() => setView('Log')}>Log</Button>
      </TopMenu>

      {view === 'Summary' && summary && <ProcessSummary summary={summary} />}
      {view === 'Log'      && <ProcessLog id={pk} />}
    </PageContainer>
  );
}
