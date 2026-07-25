import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { Atoms, WEAS } from "weas";

function useNoDrag(ref: RefObject<HTMLElement>, disabled = false) {
  useEffect(() => {
    const handleClick = (event: PointerEvent) => {
      if (disabled) {
        return;
      }
      event.stopPropagation();
    };

    const element = ref.current;
    element?.addEventListener("pointerdown", handleClick);
    return () => {
      element?.removeEventListener("pointerdown", handleClick);
    };
  }, [ref, disabled]);
}

interface Kind {
  name: string;
  symbols: string[];
}

interface Site {
  kind_name: string;
  position: number[];
}

interface AtomData {
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
}

interface AtomsControlPayload {
  data: unknown;
}

interface AtomsItemProps {
  data: AtomsControlPayload;
}

function structureToAtomsData(inputData: AtomData) {
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

function aseAtomsToAtomsData(inputData: AtomData) {
  return {
    cell: inputData.cell,
    pbc: inputData.pbc,
    symbols: inputData.symbols,
    positions: inputData.positions,
  };
}

export default function AtomsItem({ data }: AtomsItemProps) {
  const weasContainerRef = useRef<HTMLDivElement | null>(null);
  useNoDrag(weasContainerRef as RefObject<HTMLElement>);

  useEffect(() => {
    const payload = data.data as AtomData;
    let atomsData: Record<string, unknown> = {};

    if (payload.node_type === "data.core.structure.StructureData.") {
      atomsData = structureToAtomsData(payload);
    } else if (
      payload.node_type === "data.pythonjob.ase.atoms.Atoms.AtomsData."
    ) {
      atomsData = aseAtomsToAtomsData(payload);
    }

    const atoms = new Atoms(atomsData);

    if (weasContainerRef.current) {
      const defaultGuiConfig = {
        controls: {
          enabled: false,
          atomsControl: false,
          colorControl: false,
          cameraControls: false,
        },
        buttons: {
          enabled: true,
          fullscreen: true,
          download: false,
        },
      };

      const preventEventPropagation = (element: HTMLElement) => {
        const stopPropagation = (event: Event) => event.stopPropagation();
        ["click", "keydown", "keyup", "keypress"].forEach((eventType) => {
          element.addEventListener(eventType, stopPropagation, false);
        });
      };

      const domElement = document.createElement("div");
      domElement.style.cssText =
        "position: relative; width: 195px; height: 195px; border: 1px solid black;";
      weasContainerRef.current.appendChild(domElement);

      preventEventPropagation(domElement);
      const editor = new WEAS({ domElement, guiConfig: defaultGuiConfig });
      editor.avr.atoms = atoms;
      editor.render();
    }
  }, [data]);

  return (
    <div
      ref={weasContainerRef}
      style={{ position: "relative", width: "200px", height: "200px" }}
    />
  );
}
