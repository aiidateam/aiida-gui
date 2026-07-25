import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import ProcessBreadcrumbs, {
  type ParentProcessEntry,
} from "../src/components/ProcessIndicator";

describe("ProcessBreadcrumbs", () => {
  test("renders nothing for undefined breadcrumb data", () => {
    const { container } = render(<ProcessBreadcrumbs />);
    expect(container).toBeEmptyDOMElement();
  });

  test("builds process/workchain/workgraph breadcrumb links", () => {
    const parentProcesses: ParentProcessEntry[] = [
      { label: "root", pk: 1, node_type: "process.workchainnode." },
      "child",
      { label: "nested", pk: 2, node_type: "process.workgraphnode." },
      "leaf",
    ];

    render(<ProcessBreadcrumbs parentProcesses={parentProcesses} />);

    const root = screen.getByRole("link", { name: "root" });
    const child = screen.getByRole("link", { name: "child" });
    const nested = screen.getByRole("link", { name: "nested" });
    const leaf = screen.getByRole("link", { name: "leaf" });

    expect(root).toHaveAttribute("href", "/workchain/1");
    expect(child).toHaveAttribute("href", "/workchain/1/child");
    expect(nested).toHaveAttribute("href", "/workgraph/2");
    expect(leaf).toHaveAttribute("href", "/workgraph/2/leaf");
  });

  test("falls back to generic process path for unknown node type", () => {
    render(
      <ProcessBreadcrumbs
        parentProcesses={[
          { label: "proc", pk: 10, node_type: "process.calculationnode." },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "proc" })).toHaveAttribute(
      "href",
      "/process/10",
    );
  });
});
