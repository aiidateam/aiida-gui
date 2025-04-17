from typing import List, Dict, Any, Union
from fastapi import APIRouter, HTTPException, Query
from aiida import orm

router = APIRouter()


@router.get("/api/datanode-data")
async def read_datanode_data(
    typeSearch: str | None = Query(None),
    labelSearch: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(15, gt=0, le=500),
) -> Dict[str, Any]:
    """
    Return a slice of Data nodes plus the overall row count
    so the frontend can paginate on the server.
    """
    from aiida.orm import QueryBuilder, Data
    from aiida_workgraph_web_ui.backend.app.utils import time_ago

    qb = QueryBuilder()
    filters: dict[str, Any] = {}

    if typeSearch:
        filters["node_type"] = {"like": f"%{typeSearch}%"}
    if labelSearch:
        filters["label"] = {"like": f"%{labelSearch}%"}

    qb.append(
        Data,
        filters=filters,
        project=["id", "uuid", "ctime", "node_type", "label"],
        tag="d",
    )
    qb.order_by({"d": {"ctime": "desc"}})

    total_rows = qb.count()  # ← number of rows *before* slicing
    qb.offset(skip).limit(limit)  # ← slice that will be sent to the client

    records = qb.all()
    page = [
        {
            "pk": pk,
            "uuid": uuid,
            "ctime": time_ago(ctime),
            "node_type": node_type,
            "label": label,
        }
        for pk, uuid, ctime, node_type, label in records
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
