from __future__ import annotations
from typing import Dict, Any
from fastapi import HTTPException
from aiida_workgraph_web_ui.backend.app.node_table import make_node_router
from aiida import orm

project = ["id", "uuid", "ctime", "node_type", "label", "description"]

router = make_node_router(node_cls=orm.Data, prefix="datanode", project=project)


@router.get("/api/datanode/{id}")
async def read_data_node_item(id: int) -> Dict[str, Any]:

    try:
        node = orm.load_node(id)
        content = node.backend_entity.attributes
        content["node_type"] = node.node_type
        return content
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Data node {id} not found")
