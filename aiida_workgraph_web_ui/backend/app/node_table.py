from __future__ import annotations
from fastapi import APIRouter, Query, Body, HTTPException
from aiida import orm
from typing import Type, Dict, List, Union, Optional


process_project = [
    "id",
    "uuid",
    "ctime",
    "node_type",
    "attributes.process_label",
    "attributes.process_state",
    "attributes.process_status",
    "attributes.exit_status",
    "attributes.exit_message",
    "attributes.paused",
    "label",
    "description",
]


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
        item["paused"] = item.pop("attributes.paused")
        results.append(item)
    return results


def projected_data_to_dict(qb, project):
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
        item["ctime"] = time_ago(item.get("ctime"))
        results.append(item)
    return results


def make_node_router(
    *,  # force kwargs
    node_cls: Type[orm.Node],  # ⬛  WHICH NODE TYPE
    prefix: str,  # ⬛  URL prefix, e.g. "workgraph" → /api/workgraph-data
    project: Optional[List[str]] = None,
    get_data_func: callable = projected_data_to_dict,
    inclue_delete_route: bool = True,
) -> APIRouter:
    """
    Return an APIRouter exposing GET /…-data, PUT /…-data/{id},
    POST pause/play and DELETE with dry‑run for any AiiDA node subclass.
    """
    from aiida.orm import QueryBuilder
    from aiida.engine.processes.control import (
        pause_processes,
        play_processes,
        kill_processes,
    )
    from aiida.tools import delete_nodes
    from aiida_workgraph_web_ui.backend.app.utils import (
        translate_datagrid_filter_json,
    )

    router = APIRouter()

    # -------------------- GET /…-data --------------------
    @router.get(f"/api/{prefix}-data")
    async def read_node_data(
        skip: int = Query(0, ge=0),
        limit: int = Query(15, gt=0, le=500),
        sortField: str = Query(
            "pk", pattern="^(pk|ctime|process_label|state|label|description)$"
        ),
        sortOrder: str = Query("desc", pattern="^(asc|desc)$"),
        filterModel: Optional[str] = Query(None),
    ):
        qb = QueryBuilder()
        filters = (
            translate_datagrid_filter_json(filterModel, project=project)
            if filterModel
            else {}
        )
        qb.append(
            node_cls,
            filters=filters,
            project=project or ["id", "uuid", "ctime", "label", "description"],
            tag="data",
        )

        qb.order_by({"data": {sortField: sortOrder}})
        total = qb.count()
        qb.offset(skip).limit(limit)

        results = get_data_func(qb, project)
        return {"total": total, "data": results}

    # -------------------- PUT /…-data/{id} --------------------
    @router.put(f"/api/{prefix}-data" + "/{id}")
    async def update_node(
        id: int,
        payload: Dict[str, str] = Body(...),
    ):
        try:
            node = orm.load_node(id)
        except Exception:
            raise HTTPException(
                status_code=404, detail=f"{node_cls.__name__} {id} not found"
            )
        allowed = {"label", "description"}
        touched = False
        for k, v in payload.items():
            if k in allowed:
                setattr(node, k, v)
                touched = True
        if not touched:
            raise HTTPException(status_code=400, detail="No updatable fields provided")
        return {"updated": True, "pk": id, **{k: getattr(node, k) for k in allowed}}

    # -------------------- pause / play / delete -------------
    @router.post(f"/api/{prefix}/pause" + "/{id}")
    async def pause(id: int):
        try:
            pause_processes([orm.load_node(id)])
            return {"message": f"Paused {node_cls.__name__} {id}"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post(f"/api/{prefix}/play" + "/{id}")
    async def play(id: int):
        try:
            play_processes([orm.load_node(id)])
            return {"message": f"Resumed {node_cls.__name__} {id}"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post(f"/api/{prefix}/kill" + "/{id}")
    async def kill(id: int):
        try:
            kill_processes([orm.load_node(id)])
            return {"message": f"Resumed {node_cls.__name__} {id}"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    if inclue_delete_route:

        @router.delete(f"/api/{prefix}/delete" + "/{id}")
        async def delete(
            id: int, dry_run: bool = False
        ) -> Dict[str, Union[bool, str, List[int]]]:
            try:
                deleted, ok = delete_nodes([id], dry_run=dry_run)
                return {
                    "deleted": ok,
                    "message": (
                        f"{'Deleted' if ok else 'Did not delete'} {node_cls.__name__} {id}"
                        + (" [dry‑run]" if dry_run else "")
                    ),
                    "deleted_nodes": list(deleted),
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

    return router
