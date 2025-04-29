from aiida_workgraph_web_ui.backend.app.node_table import (
    make_node_router,
    process_project,
    projected_data_to_dict_process,
)
import traceback
from fastapi import HTTPException
from aiida import orm
from .utils import get_node_summary

router = make_node_router(
    node_cls=orm.ProcessNode,
    prefix="process",
    project=process_project,
    get_data_func=projected_data_to_dict_process,
)


@router.get("/api/process/{id}")
async def read_process(id: int):
    try:
        node = orm.load_node(id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Process {id} not found")

    data = get_node_summary(node)
    return data


@router.get("/api/process-logs/{id}")
async def read_workgraph_logs(id: int):
    from aiida.cmdline.utils.common import get_workchain_report

    try:
        node = orm.load_node(id)
        report = get_workchain_report(node, "REPORT")
        logs = report.splitlines()
        return logs
    except KeyError as e:
        error_traceback = traceback.format_exc()  # Capture the full traceback
        print(error_traceback)
        raise HTTPException(status_code=404, detail=f"Workgraph {id} not found, {e}")
