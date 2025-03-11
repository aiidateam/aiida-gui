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

function Breadcrumbs({ parentWorkGraphs }) {
  // If empty or undefined, show nothing
  if (!parentWorkGraphs || parentWorkGraphs.length === 0) {
    return null;
  }

  let pathSoFar = ''; // We'll build up the path as we go
  const crumbs = [];

  for (const item of parentWorkGraphs) {
    if (Array.isArray(item)) {
      // item is [label, pk]
      const [label, pk] = item;
      // Reset the path to /workgraph/{pk}
      pathSoFar = `/workgraph/${pk}`;
      crumbs.push({ label, url: pathSoFar });
    } else if (typeof item === 'string') {
      // item is a plain string (node name, etc.)
      if (!pathSoFar) {
        // If pathSoFar is empty, we can't append. Maybe skip or handle error.
        // Typically you'd always have at least one [label, pk] first.
        continue;
      }
      // Append the node name (item) to the path
      pathSoFar += `/${item}`;
      crumbs.push({ label: item, url: pathSoFar });
    }
  }

  // You can pick your own separator or icon
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
