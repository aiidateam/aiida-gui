import React from 'react';
import styled from 'styled-components';

const BreadcrumbContainer = styled.nav`
  background-color: #f7f7f7;
  padding: 10px;
  font-size: 0.9em;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;

const BreadcrumbLink = styled.a`
  color: #007bff;
  text-decoration: none;
  cursor: pointer;
  margin: 0 5px;

  &:hover {
    text-decoration: underline;
  }
`;

const Separator = styled.span`
  margin: 0 5px;
  color: #ccc;
`;

function Breadcrumbs({ parentProcesses }) {
  // If empty or undefined, show nothing
  if (!parentProcesses || parentProcesses.length === 0) {
    return null;
  }

  let pathSoFar = ''; // We'll build up the path as we go
  const crumbs = [];

  for (const item of parentProcesses) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      // item is an object: { label, pk, node_type }
      const { label, pk, node_type } = item;
      const typeKey = node_type.toLowerCase();

      if (typeKey.endsWith('workgraphnode.')) {
        pathSoFar = `/workgraph/${pk}`;
      } else if (typeKey.endsWith('workchainnode.')) {
        pathSoFar = `/workchain/${pk}`;
      } else {
        pathSoFar = `/process/${pk}`;
      }

      crumbs.push({ label, url: pathSoFar });
    } else if (typeof item === 'string') {
      // item is a plain string (node name, etc.)
      if (!pathSoFar) {
        // If pathSoFar is empty, we can't append. Maybe skip or handle error.
        continue;
      }
      pathSoFar += `/${item}`;
      crumbs.push({ label: item, url: pathSoFar });
    }
  }

  // can pick other separator or icon
  const separatorIcon = '🍞';

  return (
    <BreadcrumbContainer aria-label="breadcrumb">
      {crumbs.map((crumb, index) => (
        <React.Fragment key={crumb.url}>
          <BreadcrumbLink href={crumb.url}>
            {crumb.label}
          </BreadcrumbLink>
          {index < crumbs.length - 1 && <Separator>{separatorIcon}</Separator>}
        </React.Fragment>
      ))}
    </BreadcrumbContainer>
  );
}

export default Breadcrumbs;
