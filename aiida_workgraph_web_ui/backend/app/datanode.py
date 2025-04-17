from __future__ import annotations
from typing import List, Dict, Any, Union, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from aiida import orm

router = APIRouter()


@router.get("/api/datanode-data")
async def read_datanode_data(
    skip: int = Query(0, ge=0),
    limit: int = Query(15, gt=0, le=500),
    sortField: str = Query("pk", pattern="^(pk|ctime|node_type|label|description)$"),
    sortOrder: str = Query("desc", pattern="^(asc|desc)$"),
    filterModel: Optional[str] = Query(None),  # <-- NEW
) -> Dict[str, Any]:
    """
    Return a page slice, total row count, **plus server‑side filtering**.
    """
    from aiida.orm import QueryBuilder, Data
    from aiida_workgraph_web_ui.backend.app.utils import (
        time_ago,
        translate_datagrid_filter_json,
    )

    qb = QueryBuilder()
    filters = {}

    # ------------ translate DataGrid's filter model ------------ #
    if filterModel:
        filters = translate_datagrid_filter_json(filterModel)  # factor out for reuse

    # ------------------ base query ------------------ #
    qb.append(
        Data,
        filters=filters,
        project=["id", "uuid", "ctime", "node_type", "label", "description"],
        tag="data",
    )

    # -------------- server‑side order / paging -------------- #
    col_map = {
        "pk": "id",
        "ctime": "ctime",
        "node_type": "node_type",
        "label": "label",
        "description": "description",
    }
    qb.order_by({"data": {col_map[sortField]: sortOrder}})
    total_rows = qb.count()
    qb.offset(skip).limit(limit)

    page = [
        {
            "pk": pk,
            "uuid": uuid,
            "ctime": time_ago(ctime),
            "node_type": node_type,
            "label": label,
            "description": description,
        }
        for pk, uuid, ctime, node_type, label, description in qb.all()
    ]
    return {"total": total_rows, "data": page}


@router.get("/api/datanode/{id}")
async def read_data_node_item(id: int) -> Dict[str, Any]:

    try:
        node = orm.load_node(id)
        content = node.backend_entity.attributes
        content["node_type"] = node.node_type
        return content
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Data node {id} not found")


# Route for deleting a datanode item
@router.delete("/api/datanode/delete/{id}")
async def delete_data_node(
    id: int,
    dry_run: bool = False,
) -> Dict[str, Union[bool, str, List[int]]]:
    from aiida.tools import delete_nodes

    try:
        # Perform the delete action here
        deleted_nodes, was_deleted = delete_nodes([id], dry_run=dry_run)
        if was_deleted:
            return {
                "deleted": True,
                "message": f"Deleted data node {id}",
                "deleted_nodes": list(deleted_nodes),
            }
        else:
            message = f"Did not delete data node {id}"
            if dry_run:
                message += " [dry-run]"
            return {
                "deleted": False,
                "message": message,
                "deleted_nodes": list(deleted_nodes),
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/datanode/{id}")
async def update_data_node(
    id: int,
    payload: Dict[str, str] = Body(
        ..., examples={"label": "new‑label", "description": "some text"}
    ),
):
    """
    Update the label and/or description of a single Data node.
    Accepts JSON like {"label": "foo"} or {"description": "bar"}.
    """
    try:
        node = orm.load_node(id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Data node {id} not found")

    allowed = {"label", "description"}
    changed = False

    for key, value in payload.items():
        if key not in allowed:
            continue
        setattr(node, key, value)
        changed = True

    if not changed:
        raise HTTPException(status_code=400, detail="No updatable fields provided")

    return {"updated": True, "pk": id, **{k: getattr(node, k) for k in allowed}}
