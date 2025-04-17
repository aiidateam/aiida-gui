from __future__ import annotations
from typing import Dict, Any
from fastapi import HTTPException
from aiida_workgraph_web_ui.backend.app.node_table import make_node_router
from aiida import orm

project = ["id", "uuid", "time", "label", "description"]


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
        item["ctime"] = time_ago(item.get("time"))
        results.append(item)
    return results


router = make_node_router(
    node_cls=orm.Group,
    prefix="groupnode",
    project=project,
    get_data_func=projected_data_to_dict,
)


@router.get("/api/groupnode/{id}")
async def read_data_node_item(id: int) -> Dict[str, Any]:

    try:
        node = orm.load_node(id)
        content = node.backend_entity.attributes
        return content
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Group node {id} not found")
