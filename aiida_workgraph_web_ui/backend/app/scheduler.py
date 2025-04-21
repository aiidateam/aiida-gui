""""""
from __future__ import annotations
import typing as t

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from aiida.cmdline.utils.decorators import with_dbenv
from aiida_workgraph.engine.scheduler.client import (
    get_scheduler_client,
    get_all_scheduler_nodes,
    get_scheduler_node,
)
from aiida_workgraph.engine.scheduler.scheduler import Scheduler
import kiwipy
from aiida.cmdline.utils.common import format_local_time
from aiida import orm

router = APIRouter()


def projected_data_to_dict_process(qb, project):
    """
    Convert the projected data from a QueryBuilder to a list of dictionaries.
    """
    from aiida_workgraph_web_ui.backend.app.utils import time_ago

    # Iterate over the results and convert each row to a dictionary
    results = []
    for row in qb.all():
        item = dict(zip(project or [], row))
        # Add computed/presentational fields
        item["pk"] = item.pop("id")
        item["ctime"] = time_ago(item.pop("ctime"))
        item["process_label"] = item.pop("attributes.process_label")
        process_state = item.pop("attributes.process_state")
        item["process_state"] = process_state.title() if process_state else None
        item["process_status"] = item.pop("attributes.process_status")
        item["exit_status"] = item.pop("attributes.exit_status")
        item["exit_message"] = item.pop("attributes.exit_message")
        item["priority"] = item.pop("extras._scheduler_priority")
        item["paused"] = item.pop("attributes.paused")
        results.append(item)
    return results


# one place that converts a Scheduler instance → SchedulerStatusModel
def scheduler_to_status(sched: "Scheduler") -> "SchedulerStatusModel":
    return SchedulerStatusModel(
        name=sched.name,
        pk=sched.pk,
        running=sched.is_running,
        waiting_process_count=len(sched.waiting_process),
        running_process_count=len(sched.running_process),
        running_calcjob_count=len(sched.running_calcjob),
        running_workflow_count=len(sched.running_workflow),
        max_calcjobs=sched.max_calcjobs,
        max_workflows=sched.max_workflows,
        max_processes=sched.max_processes,
        ctime=format_local_time(sched.ctime),
    )


class SchedulerStatusModel(BaseModel):
    """Response model describing a scheduler's status."""

    name: str = Field(..., description="The name of the scheduler")
    pk: int = Field(..., description="Primary key of the scheduler")
    waiting_process_count: int = Field(..., description="Number of waiting processes")
    running_process_count: int = Field(..., description="Number of running processes")
    running_calcjob_count: int = Field(..., description="Number of running calcjobs")
    running_workflow_count: int = Field(..., description="Number of running workflows")
    max_calcjobs: int = Field(..., description="Maximum number of calcjobs allowed")
    max_workflows: int = Field(..., description="Maximum number of workflows allowed")
    max_processes: int = Field(
        ..., description="Maximum number of concurrent processes"
    )
    ctime: t.Optional[str] = Field(None, description="Creation time of the scheduler")
    running: t.Optional[bool] = Field(
        None, description="Whether the scheduler is running"
    )


class DaemonStatusModel(BaseModel):
    """Response model describing a scheduler's status."""

    name: str = Field(..., description="The name of the scheduler")
    running: bool = Field(..., description="Whether the scheduler is running")
    memory: t.Optional[float] = Field(None, description="Memory usage of the scheduler")
    cpu: t.Optional[float] = Field(None, description="CPU usage of the scheduler")
    pid: t.Optional[int] = Field(None, description="Process ID of the scheduler")
    ctime: t.Optional[str] = Field(None, description="Creation time of the scheduler")
    start_time: t.Optional[str] = Field(None, description="Start time of the scheduler")


@router.get("/api/scheduler/list", response_model=t.List[SchedulerStatusModel])
@with_dbenv()
async def list_schedulers():
    """
    List all schedulers with their status.
    """
    return [scheduler_to_status(s) for s in get_all_scheduler_nodes()]


@router.get("/api/scheduler/data/{name}", response_model=SchedulerStatusModel)
@with_dbenv()
async def get_scheduler_data(name: str, timeout=3):
    """
    Get status details for a scheduler by name.
    """

    sched = get_scheduler_node(name=name)
    if not sched:
        raise HTTPException(status_code=404, detail=f"Scheduler {name} not found.")
    return scheduler_to_status(sched)


@router.get("/api/scheduler/status/{name}", response_model=DaemonStatusModel)
@with_dbenv()
async def get_scheduler_daemon_status(name: str, timeout=3):
    """
    Get daemon status for a scheduler by name.
    """

    client = get_scheduler_client(scheduler_name=name)
    worker_info = {}
    try:
        client.get_status(timeout=timeout)
        worker_response = client.get_worker_info()
        for pid, info in worker_response["info"].items():
            if isinstance(info, dict):
                worker_info["pid"] = pid
                worker_info["memory"] = info.get("mem")
                worker_info["cpu"] = info.get("cpu")
                worker_info["start_time"] = format_local_time(info.get("create_time"))
        running = True
    except Exception:
        running = False
    daemon = DaemonStatusModel(
        name=name,
        running=running,
        memory=worker_info.get("memory"),
        cpu=worker_info.get("cpu"),
        pid=worker_info.get("pid"),
        start_time=worker_info.get("start_time"),
    )
    return daemon


class SchedulerControlModel(BaseModel):
    """Input model for controlling a scheduler."""

    name: str = Field(..., description="Scheduler name")
    max_calcjobs: t.Optional[int] = Field(None, description="Maximum calcjobs")
    max_workflows: t.Optional[int] = Field(None, description="Maximum workflows")
    max_processes: t.Optional[int] = Field(None, description="Maximum processes")
    foreground: t.Optional[bool] = Field(False, description="Run in foreground")
    timeout: t.Optional[int] = Field(None, description="Optional timeout value")


@router.post("/api/scheduler/add", response_model=SchedulerStatusModel)
@with_dbenv()
async def add_scheduler_endpoint(control: SchedulerControlModel):
    """
    Start the scheduler with the given parameters.
    """
    from aiida_workgraph.orm.scheduler import SchedulerNode

    sched = SchedulerNode(
        name=control.name,
        max_calcjobs=control.max_calcjobs,
        max_workflows=control.max_workflows,
        max_processes=control.max_processes,
    ).store()
    return scheduler_to_status(sched)


@router.post("/api/scheduler/start", response_model=SchedulerStatusModel)
@with_dbenv()
async def start_scheduler_endpoint(control: SchedulerControlModel):
    """
    Start the scheduler with the given parameters.
    """
    import asyncio
    import time

    client = get_scheduler_client(scheduler_name=control.name)

    try:
        client.start_daemon(
            max_calcjobs=control.max_calcjobs,
            max_workflows=control.max_workflows,
            max_processes=control.max_processes,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    timeout_seconds = 10
    poll_interval = 1
    start_time = time.time()

    # Wait for the scheduler to be available or timeout
    sched = get_scheduler_node(name=control.name)
    while not sched:
        if time.time() - start_time > timeout_seconds:
            raise HTTPException(
                status_code=504,
                detail=f"Timeout while waiting for scheduler '{control.name}' to start.",
            )
        await asyncio.sleep(poll_interval)
        sched = get_scheduler_node(name=control.name)
    if not sched:
        raise HTTPException(
            status_code=404, detail=f"Scheduler {control.name} not found."
        )
    return scheduler_to_status(sched)


@router.post("/api/scheduler/delete")
@with_dbenv()
async def delete_scheduler_endpoint(control: SchedulerControlModel):
    """
    Delete a scheduler by name.

    Raises HTTP 400 if the scheduler is running. Otherwise deletes the node from the DB.
    """
    from aiida.tools import delete_nodes

    scheduler = get_scheduler_node(name=control.name)
    if not scheduler:
        raise HTTPException(
            status_code=404, detail=f"Scheduler '{control.name}' not found."
        )

    # Check if running
    if Scheduler.get_status(name=scheduler.name):
        raise HTTPException(
            status_code=400,
            detail=f"Scheduler '{scheduler.name}' is running, please stop it first.",
        )

    _, was_deleted = delete_nodes([scheduler.pk], dry_run=False)
    if not was_deleted:
        raise HTTPException(
            status_code=500, detail="Could not delete the scheduler node."
        )

    return {"message": f"Scheduler '{control.name}' was deleted successfully."}


@router.post("/api/scheduler/stop", response_model=SchedulerStatusModel)
@with_dbenv()
async def stop_scheduler_endpoint(
    name: str = Query(..., description="Scheduler name to stop")
):
    """
    Stop a running scheduler.
    """

    sched = get_scheduler_node(name=name)
    if not sched:
        raise HTTPException(status_code=404, detail=f"Scheduler {name} not found.")
    try:
        client = get_scheduler_client(scheduler_name=sched.name)
        client.stop_daemon(wait=True)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return scheduler_to_status(sched)


@router.post("/api/scheduler/set_max_calcjobs", response_model=SchedulerStatusModel)
@with_dbenv()
async def set_max_calcjobs(control: SchedulerControlModel):
    """
    Set maximum calcjobs for the scheduler.
    """
    try:
        Scheduler.set_max_calcjobs(name=control.name, max_calcjobs=control.max_calcjobs)
    except kiwipy.exceptions.UnroutableError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    sched = get_scheduler_node(name=control.name)
    return scheduler_to_status(sched)


@router.post("/api/scheduler/set_max_workflows", response_model=SchedulerStatusModel)
@with_dbenv()
async def set_max_workflows(control: SchedulerControlModel):
    """
    Set maximum workflows for the scheduler.
    """
    print("set_max_workflows", control)
    try:
        Scheduler.set_max_workflows(
            name=control.name, max_workflows=control.max_workflows
        )
    except kiwipy.exceptions.UnroutableError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    sched = get_scheduler_node(name=control.name)
    return scheduler_to_status(sched)


@router.post("/api/scheduler/set_max_processes", response_model=SchedulerStatusModel)
@with_dbenv()
async def set_max_processes(control: SchedulerControlModel):
    """
    Set maximum processes for the scheduler.
    """
    try:
        Scheduler.set_max_processes(
            name=control.name, max_processes=control.max_processes
        )
    except kiwipy.exceptions.UnroutableError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    sched = get_scheduler_node(name=control.name)
    return scheduler_to_status(sched)


@router.get("/api/scheduler/{name}/process-data")
async def read_scheduler_process(
    name: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(15, gt=0, le=500),
    sortField: str = Query("pk"),
    sortOrder: str = Query("desc", pattern="^(asc|desc)$"),
    filterModel: t.Optional[str] = Query(None),
):
    from .node_table import process_project

    project = process_project + ["extras._scheduler", "extras._scheduler_priority"]
    scheduler = get_scheduler_node(name=name)
    waiting_process = scheduler.waiting_process
    running_process = scheduler.running_process
    processes = waiting_process + running_process
    if not processes:
        return {"total": 0, "data": []}

    qb = orm.QueryBuilder()
    qb.append(
        orm.ProcessNode,
        filters={"id": {"in": processes}},
        project=project,
        tag="n",
    )

    # priorities = scheduler.get_process_priority()
    # server‑side filters coming from the DataGrid
    if filterModel:
        from aiida_workgraph_web_ui.backend.app.utils import (
            translate_datagrid_filter_json,
        )

        qb.add_filter("n", translate_datagrid_filter_json(filterModel, project=project))

    qb.order_by({"n": {sortField: sortOrder}})
    total = qb.count()
    qb.offset(skip).limit(limit)

    results = projected_data_to_dict_process(qb, project)
    return {"total": total, "data": results}


@router.put("/api/scheduler" + "/{name}" + "/process-data" + "/{id}")
async def update_node(
    name: str,
    id: int,
    payload: t.Dict[str, t.Union[str, int]] = Body(...),
):
    try:
        node = orm.load_node(id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Process {id} not found")
    allowed = {"label", "description", "priority"}
    touched = False
    updated_data = {}
    for k, v in payload.items():
        if k in allowed:
            if k == "priority":
                node.base.extras.set("_scheduler_priority", v)
            else:
                setattr(node, k, v)
            touched = True
            updated_data[k] = v
    if not touched:
        raise HTTPException(status_code=400, detail="No updatable fields provided")
    return {"updated": True, "pk": id, **updated_data}
