from __future__ import annotations
from fastapi import HTTPException
from aiida import orm
import traceback
from aiida_workgraph_web_ui.backend.app.node_table import (
    make_node_router,
    process_project,
    projected_data_to_dict_process,
)
from aiida.orm import WorkChainNode
from .utils import get_parent_processes


router = make_node_router(
    node_cls=WorkChainNode,
    prefix="workchain",
    project=process_project,
    get_data_func=projected_data_to_dict_process,
)


@router.get("/api/workchain/{id}")
async def read_workchain(id: int):
    from .utils import (
        get_node_summary,
        get_node_inputs,
        get_node_outputs,
        get_nodes_called,
        get_nodes_caller,
        get_workchain_data,
    )

    try:

        node = orm.load_node(id)

        content = get_workchain_data(node)
        if content is None:
            print("No workchain data found in the node.")
            return
        summary = {
            "table": get_node_summary(node),
            "inputs": get_node_inputs(id),
            "outputs": get_node_outputs(id),
            "called": get_nodes_called(id),
            "caller": get_nodes_caller(id),
        }

        parent_workchains = get_parent_processes(id)
        parent_workchains.reverse()
        content["summary"] = summary
        content["parent_workchains"] = parent_workchains
        content["processes_info"] = {}
        return content
    except KeyError as e:
        error_traceback = traceback.format_exc()  # Capture the full traceback
        print(error_traceback)
        raise HTTPException(status_code=404, detail=f"Workchain {id} not found, {e}")


@router.get("/api/workchain-state/{id}")
async def read_tasks_state(id: int, item_type: str = "called_process"):
    from aiida_workgraph.utils import get_processes_latest

    try:
        processes_info = get_processes_latest(id, item_type=item_type)
        return processes_info
    except KeyError as e:
        error_traceback = traceback.format_exc()  # Capture the full traceback
        print(error_traceback)
        raise HTTPException(status_code=404, detail=f"Workchain {id} not found, {e}")
