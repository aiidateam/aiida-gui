from __future__ import annotations
from typing import Dict, Optional, Union, List
from fastapi import HTTPException, Query
from aiida_gui.app.node_table import make_node_router
from aiida import orm
import traceback

project = ["id", "uuid", "time", "label", "description"]


def projected_data_to_dict(qb, project):
    """
    Convert the projected data from a QueryBuilder to a list of dictionaries.
    """
    from aiida_gui.app.utils import time_ago

    # Iterate over the results and convert each row to a dictionary
    results = []
    for row in qb.all():
        item = dict(zip(project or [], row))
        # Add computed/presentational fields
        item["pk"] = item.pop("id")
        item["ctime"] = time_ago(item.get("ctime"))
        results.append(item)
    return results


# due to a bug in aiida-core: https://github.com/aiidateam/aiida-core/pull/6828
# we need use `time` instead of `ctime`
def projected_data_to_dict_group(qb, project):
    """
    Convert the projected data from a QueryBuilder to a list of dictionaries.
    """
    from aiida_gui.app.utils import time_ago

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
    get_data_func=projected_data_to_dict_group,
    inclue_delete_route=False,
)


@router.get("/api/groupnode/{id}")
async def read_group_summary(id: int) -> Dict[str, Union[str, int]]:
    try:
        g = orm.load_group(id)
        summary = {
            "pk": g.pk,
            "uuid": g.uuid,
            "label": g.label,
            "description": g.description or "",
            "type_string": g.type_string,
            "count": g.count(),
        }
        return summary
    except Exception:
        raise HTTPException(status_code=404, detail=f"Group {id} not found")


# ---------------------------------------------------------------------------
# ─ 3. paginated members
#      GET /api/groupnode/{id}/members-data   (same contract as -data)
# ---------------------------------------------------------------------------
@router.get("/api/groupnode/{id}/members-data")
async def read_group_members(
    id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(15, gt=0, le=500),
    sortField: str = Query("pk"),
    sortOrder: str = Query("desc", pattern="^(asc|desc)$"),
    filterModel: Optional[str] = Query(None),
):

    project = ["id", "ctime", "node_type", "label", "description"]

    qb = orm.QueryBuilder()
    qb.append(
        orm.Group,
        filters={
            "id": id,
        },
        tag="group",
    )
    qb.append(
        orm.Node,
        project=project,
        with_group="group",
        tag="node",
    )

    # server‑side filters coming from the DataGrid
    if filterModel:
        from aiida_gui.app.utils import (
            translate_datagrid_filter_json,
        )

        qb.add_filter(
            "node", translate_datagrid_filter_json(filterModel, project=project)
        )

    qb.order_by({"node": {sortField: sortOrder}})
    total = qb.count()
    qb.offset(skip).limit(limit)

    results = projected_data_to_dict(qb, project)
    return {"total": total, "data": results}


@router.delete("/api/groupnode/delete" + "/{id}")
async def delete(
    id: int, dry_run: bool = False, delete_nodes: bool = False
) -> Dict[str, Union[bool, str, List[int]]]:
    from aiida.tools import delete_group_nodes

    try:
        if dry_run:
            return {
                "deleted_nodes": [id],
            }
        if delete_nodes:
            _, nodes_deleted = delete_group_nodes([id], dry_run=dry_run)
            if nodes_deleted:
                orm.Group.collection.delete(id)
                ok = True
            else:
                ok = False
        else:
            orm.Group.collection.delete(id)
            ok = True
        return {
            "deleted": ok,
            "message": (
                f"{'Deleted' if ok else 'Did not delete'} {orm.Group.__name__} {id}"
            ),
        }
    except Exception as e:
        error_traceback = traceback.format_exc()  # Capture the full traceback
        print(error_traceback)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/groupnode/{group_id}/members/remove/{node_id}")
async def delete_node(
    group_id: int,
    node_id: int,
) -> Dict[str, Union[bool, str, List[int]]]:

    try:
        group = orm.load_group(group_id)
        group.remove_nodes([orm.load_node(node_id)])
        return {
            "removed": True,
            "message": f"Removed node {node_id} from the group",
        }
    except Exception as e:
        error_traceback = traceback.format_exc()  # Capture the full traceback
        print(error_traceback)
        raise HTTPException(status_code=500, detail=str(e))
