import { Fragment } from "react";
import styled from "styled-components";

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

export interface ParentProcessObject {
  label: string;
  pk: number;
  node_type: string;
}

export type ParentProcessEntry = ParentProcessObject | string;

interface ProcessBreadcrumbsProps {
  parentProcesses?: ParentProcessEntry[];
}

export default function ProcessBreadcrumbs({
  parentProcesses,
}: ProcessBreadcrumbsProps) {
  if (!parentProcesses?.length) {
    return null;
  }

  let pathSoFar = "";
  const crumbs: Array<{ label: string; url: string }> = [];

  for (const item of parentProcesses) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const { label, pk, node_type: nodeType } = item;
      const typeKey = nodeType.toLowerCase();

      if (typeKey.endsWith("workgraphnode.")) {
        pathSoFar = `/workgraph/${pk}`;
      } else if (typeKey.endsWith("workchainnode.")) {
        pathSoFar = `/workchain/${pk}`;
      } else {
        pathSoFar = `/process/${pk}`;
      }

      crumbs.push({ label, url: pathSoFar });
    } else if (typeof item === "string") {
      if (!pathSoFar) {
        continue;
      }
      pathSoFar += `/${item}`;
      crumbs.push({ label: item, url: pathSoFar });
    }
  }

  const separatorIcon = "/";

  return (
    <BreadcrumbContainer aria-label="breadcrumb">
      {crumbs.map((crumb, index) => (
        <Fragment key={crumb.url}>
          <BreadcrumbLink href={crumb.url}>{crumb.label}</BreadcrumbLink>
          {index < crumbs.length - 1 ? (
            <Separator>{separatorIcon}</Separator>
          ) : null}
        </Fragment>
      ))}
    </BreadcrumbContainer>
  );
}
