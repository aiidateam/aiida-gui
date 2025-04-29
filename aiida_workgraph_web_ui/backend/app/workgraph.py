from __future__ import annotations
from fastapi import HTTPException
from aiida import orm
from aiida.orm.utils.serialize import deserialize_unsafe
import traceback
from aiida_workgraph_web_ui.backend.app.node_table import (
    make_node_router,
    process_project,
    projected_data_to_dict_process,
)
from aiida_workgraph.orm.workgraph import WorkGraphNode
from .utils import get_node_summary, get_parent_processes


router = make_node_router(
    node_cls=WorkGraphNode,
    prefix="workgraph",
    project=process_project,
    get_data_func=projected_data_to_dict_process,
)


@router.get("/api/workgraph/{id}/{path:path}")
async def read_sub_workgraph(id: int, path: str):
    """
    path is a string that contains everything after {id}/
    e.g. if the request is /api/workgraph/123/foo/bar/baz
    then path = "foo/bar/baz"
    """
    from aiida_workgraph.utils import workgraph_to_short_json, shallow_copy_nested_dict
    from aiida.orm import load_node

    try:
        node = load_node(id)
        segments = path.split("/")
        ndata = node.workgraph_data["tasks"][segments[0]]
        ndata = deserialize_unsafe(ndata)
        if ndata["metadata"]["node_type"].upper() == "WORKGRAPH":
            executor = node.task_executors.get(segments[0])
            graph_data = executor["graph_data"]
            for segment in segments[1:]:
                graph_data = graph_data["tasks"][segment]["executor"]["graph_data"]
        elif ndata["metadata"]["node_type"].upper() == "MAP":
            map_info = node.task_map_info.get(segments[0])
            graph_data = {"name": segments[-1], "uuid": "", "tasks": {}, "links": []}
            # copy tasks
            for child in map_info["children"]:
                child_data = deserialize_unsafe(node.workgraph_data["tasks"][child])
                for prefix in map_info["prefix"]:
                    new_data = shallow_copy_nested_dict(child_data)
                    new_data["name"] = f"{prefix}_{child}"
                    graph_data["tasks"][f"{prefix}_{child}"] = new_data
            # copy links
            for link in map_info["links"]:
                if (
                    link["from_node"] in map_info["children"]
                    and link["to_node"] in map_info["children"]
                ):
                    for prefix in map_info["prefix"]:
                        from_node = f"{prefix}_{link['from_node']}"
                        to_node = f"{prefix}_{link['to_node']}"
                        graph_data["links"].append(
                            {
                                "from_node": from_node,
                                "to_node": to_node,
                                "from_socket": link["from_socket"],
                                "to_socket": link["to_socket"],
                            }
                        )
        content = workgraph_to_short_json(graph_data)
        if content is None:
            print("No workgraph data found in the node.")
            return
        summary = {
            "table": [],
            "inputs": {},
            "outputs": {},
        }

        parent_workgraphs = [[node.process_label, id]] + segments
        content["summary"] = summary
        content["parent_workgraphs"] = parent_workgraphs
        content["processes_info"] = {}
        return content
    except KeyError as e:
        error_traceback = traceback.format_exc()  # Capture the full traceback
        print(error_traceback)
        raise HTTPException(
            status_code=404, detail=f"Workgraph {id}/{path} not found, {e}"
        )


@router.get("/api/workgraph/{id}")
async def read_workgraph(id: int):

    try:

        node = orm.load_node(id)

        content = node.workgraph_data_short
        if content is None:
            print("No workgraph data found in the node.")
            return
        summary = get_node_summary(node)

        parent_workgraphs = get_parent_processes(id)
        parent_workgraphs.reverse()
        content["summary"] = summary
        content["parent_workgraphs"] = parent_workgraphs
        content["processes_info"] = {}
        return content
    except KeyError as e:
        error_traceback = traceback.format_exc()  # Capture the full traceback
        print(error_traceback)
        raise HTTPException(status_code=404, detail=f"Workgraph {id} not found, {e}")


@router.get("/api/workgraph-state/{id}")
async def read_tasks_state(id: int, item_type: str = "task"):
    from aiida_workgraph.utils import get_processes_latest

    try:
        processes_info = get_processes_latest(id, item_type=item_type)
        return processes_info
    except KeyError as e:
        error_traceback = traceback.format_exc()  # Capture the full traceback
        print(error_traceback)
        raise HTTPException(status_code=404, detail=f"Workgraph {id} not found, {e}")
