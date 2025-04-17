from __future__ import annotations
from fastapi import APIRouter, Query, Body, HTTPException
from aiida import orm
from typing import Type, Dict, List, Union, Optional


def make_node_router(
    *,  # force kwargs
    node_cls: Type[orm.Node],  # ⬛  WHICH NODE TYPE
    prefix: str,  # ⬛  URL prefix, e.g. "workgraph" → /api/workgraph-data
) -> APIRouter:
    """
    Return an APIRouter exposing GET /…-data, PUT /…-data/{id},
    POST pause/play and DELETE with dry‑run – exactly the contract your
    table expects – for any AiiDA node subclass.
    """
    from aiida.orm import QueryBuilder
    from aiida.engine.processes.control import pause_processes, play_processes
    from aiida.tools import delete_nodes
    from aiida_workgraph_web_ui.backend.app.utils import (
        time_ago,
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
        filters = translate_datagrid_filter_json(filterModel) if filterModel else {}
        qb.append(
            node_cls,
            filters=filters,
            project=[
                "id",
                "uuid",
                "ctime",
                "attributes.process_label",
                "attributes.process_state",
                "attributes.process_status",
                "attributes.exit_status",
                "attributes.exit_message",
                "label",
                "description",
            ],
            tag="data",
        )

        col_map = {
            "pk": "id",
            "ctime": "ctime",
            "process_label": "attributes.process_label",
            "state": "attributes.process_state",
            "status": "attributes.process_status",
            "exit_status": "attributes.exit_status",
            "exit_message": "attributes.exit_message",
            "label": "label",
            "description": "description",
        }
        qb.order_by({"data": {col_map[sortField]: sortOrder}})
        total = qb.count()
        qb.offset(skip).limit(limit)

        results = [
            {
                "pk": pk,
                "uuid": uuid,
                "ctime": time_ago(ctime),
                "process_label": plabel,
                "state": state.title() if state else None,
                "status": status,
                "exit_status": exit_status,
                "exit_message": exit_message,
                "label": label,
                "description": description,
            }
            for pk, uuid, ctime, plabel, state, status, exit_status, exit_message, label, description in qb.all()
        ]
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
