import { useEffect, useRef } from "react";
import { Atoms, WEAS } from "weas";

interface Kind {
  name: string;
  symbols: string[];
}

interface Site {
  kind_name: string;
  position: number[];
}

interface BaseNodeData {
  node_type: string;
  cell?: number[][];
  pbc1?: boolean;
  pbc2?: boolean;
  pbc3?: boolean;
  kinds?: Kind[];
  sites?: Site[];
  pbc?: boolean[];
  symbols?: string[];
  positions?: number[][];
  extras?: Array<Record<string, unknown>>;
}

interface AtomsItemProps {
  data: BaseNodeData;
}

function structureToAtomsData(inputData: BaseNodeData) {
  const data = {
    cell: inputData.cell,
    pbc: [inputData.pbc1, inputData.pbc2, inputData.pbc3],
    species: {} as Record<string, string>,
    symbols: [] as string[],
    positions: [] as number[][],
  };

  inputData.kinds?.forEach((kind) => {
    data.species[kind.name] = kind.symbols[0];
  });

  inputData.sites?.forEach((site) => {
    data.symbols.push(site.kind_name);
    data.positions.push(site.position);
  });

  return data;
}

function aseAtomsToAtomsData(inputData: BaseNodeData) {
  return {
    cell: inputData.cell,
    pbc: inputData.pbc,
    symbols: inputData.symbols,
    positions: inputData.positions,
  };
}

export default function AtomsItem({ data }: AtomsItemProps) {
  const weasContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let atoms: any = null;

    if (data.node_type === "data.core.structure.StructureData.") {
      atoms = new Atoms(structureToAtomsData(data));
    } else if (
      data.node_type === "data.core.array.trajectory.TrajectoryData."
    ) {
      atoms = (data.extras || []).map((atomsData) => new Atoms(atomsData));
    } else if (data.node_type === "data.pythonjob.ase.atoms.Atoms.AtomsData.") {
      atoms = new Atoms(aseAtomsToAtomsData(data));
    }

    if (weasContainerRef.current && atoms) {
      const editor = new WEAS({ domElement: weasContainerRef.current });
      editor.avr.atoms = atoms;
      editor.render();
    }
  }, [data]);

  return (
    <div>
      <h1>Atoms Viewer</h1>
      <div
        ref={weasContainerRef}
        style={{ position: "relative", width: "600px", height: "600px" }}
      />
    </div>
  );
}
