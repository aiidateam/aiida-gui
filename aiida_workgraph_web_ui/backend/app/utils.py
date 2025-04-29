from __future__ import annotations

from typing import Dict, Optional, Union, Tuple, List, Any
from aiida.orm import load_node, Node
from datetime import datetime
from dateutil import relativedelta
from dateutil.tz import tzlocal


def get_executor_source(tdata: Any) -> Tuple[bool, Optional[str]]:
    """Get the source code of the executor."""
    import inspect
    from node_graph.executor import NodeExecutor

    executor = NodeExecutor(**tdata["executor"]).executor
    if callable(executor):
        try:
            source_lines, _ = inspect.getsourcelines(executor)
            source_code = "".join(source_lines)
            return source_code
        except (TypeError, OSError):
            source_code = tdata["executor"].get("source_code", "")
            return source_code
    else:
        return str(executor)


def get_node_recursive(links: Dict) -> Dict[str, Union[List[int], str]]:
    """Recursively get a dictionary of nodess."""
    from collections.abc import Mapping

    data = {}
    for label, value in links.items():
        if isinstance(value, Mapping):
            data.update({label: get_node_recursive(value)})
        else:
            data[label] = [value.pk, value.__class__.__name__, value.node_type]
    return data


def get_node_inputs(pk: int | Node) -> Union[str, Dict[str, Union[List[int], str]]]:
    from aiida.common.links import LinkType

    if pk is None:
        return {}

    node = load_node(pk) if isinstance(pk, int) else pk
    nodes_input = node.base.links.get_incoming(
        link_type=(LinkType.INPUT_CALC, LinkType.INPUT_WORK)
    )
    if nodes_input:
        result = get_node_recursive(nodes_input.nested())
    else:
        result = {}

    return result


def get_nodes_called(pk: int | Node) -> Union[str, Dict[str, Union[List[int], str]]]:
    from aiida.common.links import LinkType

    node = load_node(pk) if isinstance(pk, int) else pk
    links_called = node.base.links.get_outgoing(
        link_type=(LinkType.CALL_CALC, LinkType.CALL_WORK)
    )
    nodes_called = {}
    for link in links_called:
        nodes_called[link.link_label] = [
            link.node.pk,
            link.node.__class__.__name__,
            link.node.node_type,
        ]
    return nodes_called


def get_nodes_caller(pk: int | Node) -> Union[str, Dict[str, Union[List[int], str]]]:
    from aiida.common.links import LinkType

    node = load_node(pk) if isinstance(pk, int) else pk
    links_caller = node.base.links.get_incoming(
        link_type=(LinkType.CALL_CALC, LinkType.CALL_WORK)
    )
    nodes_caller = {}
    for link in links_caller:
        nodes_caller[link.link_label] = [
            link.node.pk,
            link.node.__class__.__name__,
            link.node.node_type,
        ]
    return nodes_caller


def get_node_outputs(pk: int | Node) -> Union[str, Dict[str, Union[List[int], str]]]:
    from aiida.common.links import LinkType

    if pk is None:
        return ""

    node = load_node(pk) if isinstance(pk, int) else pk
    result = ""
    nodes_output = node.base.links.get_outgoing(
        link_type=(LinkType.CREATE, LinkType.RETURN)
    )
    if nodes_output.all():
        result = get_node_recursive(nodes_output.nested())
    else:
        result = {}

    return result


def get_workchain_data(node: Node) -> dict:
    from aiida.common.links import LinkType

    graph_data = {
        "name": node.process_label,
        "uuid": node.uuid,
        "state": node.process_state,
        "nodes": {},
        "links": [],
    }

    links_called = node.base.links.get_outgoing(
        link_type=(LinkType.CALL_CALC, LinkType.CALL_WORK)
    )
    links_input = node.base.links.get_incoming(
        link_type=(LinkType.INPUT_CALC, LinkType.INPUT_WORK)
    )
    nodes_called = []
    for link in links_called:
        graph_data["nodes"][link.node.pk] = {
            "label": f"{link.link_label}-{link.node.pk}",
            "node_type": link.node.node_type,
            "pk": link.node.pk,
            "processPk": link.node.pk,
            "inputs": [],
            "properties": [],
            "outputs": [],
            "position": [0, 0],
            "children": [],
        }
        nodes_called.append(link.node)
    for node in nodes_called:
        links_input = node.base.links.get_incoming(
            link_type=(LinkType.INPUT_CALC, LinkType.INPUT_WORK)
        )
        for link in links_input:
            input_node_links_create = link.node.base.links.get_incoming(
                link_type=(LinkType.CREATE, LinkType.RETURN)
            )
            for link_create in input_node_links_create:
                if link_create.node in nodes_called:
                    graph_data["links"].append(
                        {
                            "from_node": link_create.node.pk,
                            "to_node": node.pk,
                            "from_socket": link_create.link_label,
                            "to_socket": link.link_label,
                        }
                    )
                    input = {"name": link.link_label, "identifier": "any"}
                    output = {"name": link_create.link_label, "identifier": "any"}
                    graph_data["nodes"][node.pk]["inputs"].append(input)
                    graph_data["nodes"][link_create.node.pk]["outputs"].append(output)

    return graph_data


def node_to_short_json(workgraph_pk: int, tdata: Dict[str, Any]) -> Dict[str, Any]:
    """Export a node to a rete js node."""
    from aiida_workgraph.utils import get_processes_latest

    executor = get_executor_source(tdata)
    tdata_short = {
        "node_type": tdata["metadata"]["node_type"],
        "label": tdata["name"],
        "metadata": [
            ["name", tdata["name"]],
            ["node_type", tdata["metadata"]["node_type"]],
            ["identifier", tdata["identifier"]],
        ],
        "executor": executor,
    }
    process_info = get_processes_latest(workgraph_pk, tdata["name"]).get(
        tdata["name"], {}
    )
    tdata_short["process"] = process_info
    if process_info is not None:
        tdata_short["metadata"].append(["pk", process_info.get("pk")])
        tdata_short["metadata"].append(["state", process_info.get("state")])
        tdata_short["metadata"].append(["ctime", process_info.get("ctime")])
        tdata_short["metadata"].append(["mtime", process_info.get("mtime")])
        tdata_short["inputs"] = get_node_inputs(process_info.get("pk"))
        tdata_short["outputs"] = get_node_outputs(process_info.get("pk"))
    else:
        tdata_short["inputs"] = ""
        tdata_short["outputs"] = ""
    tdata_short["state"] = process_info.get("state", "") if process_info else ""
    return tdata_short


def get_node_summary(node: Node) -> List[List[str]]:
    summary = {
        "table": get_node_summary_table(node),
        "inputs": get_node_inputs(node),
        "outputs": get_node_outputs(node),
        "called": get_nodes_called(node),
        "caller": get_nodes_caller(node),
    }
    return summary


def get_node_summary_table(pk: int | Node) -> List[List[str]]:
    """ """
    from plumpy import ProcessState
    from aiida.orm import ProcessNode

    table = []

    node = load_node(pk) if isinstance(pk, int) else pk

    if isinstance(node, ProcessNode):
        table.append(["type", node.process_label])

        try:
            process_state = ProcessState(node.process_state)
        except (AttributeError, ValueError):
            pass
        else:
            process_state_string = process_state.value.capitalize()

            if process_state == ProcessState.FINISHED and node.exit_message:
                table.append(
                    [
                        "state",
                        f"{process_state_string} [{node.exit_status}] {node.exit_message}",
                    ]
                )
            elif process_state == ProcessState.FINISHED:
                table.append(["state", f"{process_state_string} [{node.exit_status}]"])
            elif process_state == ProcessState.EXCEPTED:
                table.append(["state", f"{process_state_string} <{node.exception}>"])
            else:
                table.append(["state", process_state_string])

    else:
        table.append(["type", node.__class__.__name__])
    table.append(["pk", str(node.pk)])
    table.append(["uuid", str(node.uuid)])
    table.append(["label", node.label])
    table.append(["description", node.description])
    table.append(["ctime", node.ctime])
    table.append(["mtime", node.mtime])

    try:
        computer = node.computer
    except AttributeError:
        pass
    else:
        if computer is not None:
            table.append(["computer", f"[{node.computer.pk}] {node.computer.label}"])

    return table


def time_ago(past_time: datetime) -> str:
    # Get the current time
    now = datetime.now(tzlocal())

    # Calculate the time difference
    delta = relativedelta.relativedelta(now, past_time)

    # Format the time difference
    if delta.years > 0:
        return f"{delta.years}Y ago"
    elif delta.months > 0:
        return f"{delta.months}M ago"
    elif delta.days > 0:
        return f"{delta.days}D ago"
    elif delta.hours > 0:
        return f"{delta.hours}h ago"
    elif delta.minutes > 0:
        return f"{delta.minutes}min ago"
    else:
        return "Just now"


def translate_datagrid_filter_json(raw: str, project) -> dict:
    """
    Convert MUI DataGrid filterModel JSON into AiiDA QueryBuilder filters.
    Supports column filters & quick filter.
    """
    import json

    fm = json.loads(raw)
    filters: dict[str, Any] = {}

    #   DataGrid → QB column
    field_map = {
        "pk": "id",
        "ctime": "ctime",
        "node_type": "node_type",
        "process_label": "attributes.process_label",
        "process_state": "attributes.process_state",
        "exit_status": "attributes.exit_status",
        "exit_message": "attributes.exit_message",
        "paused": "attributes.paused",
        "label": "label",
        "description": "description",
    }

    for item in fm.get("items", []):
        field = item.get("field")
        value = item.get("value")
        operator = item.get("operator", "contains")
        if not value or field not in field_map:
            continue
        col = field_map[field]

        # numeric
        if col == "id":
            try:
                filters[col] = int(value)
            except ValueError:
                continue
        else:
            if operator in ("contains", "equals", "is"):
                filters[col] = {"like": f"%{value}%"}

    # quick filter (space‑separated)
    qf_values = fm.get("quickFilterValues", [])

    if qf_values:
        blocks = []
        for val in qf_values:
            like = {"like": f"%{val}%"}
            block = [{key: like} for key in project]
            block.append({"id": int(val)} if val.isdigit() else {})
            blocks.append({"or": block})
        filters = {"and": [filters, *blocks]} if filters else {"and": blocks}
    return filters


def get_parent_processes(pk: int) -> List[Dict[str, Union[str, int]]]:
    """Get the list of parent processes.
    Use aiida incoming links to find the parent processes.
    the parent process is the process that has a link (type CALL_WORK) to the current process.
    """
    from aiida import orm
    from aiida.common.links import LinkType

    node = orm.load_node(pk)
    parent_processes = [
        {"label": node.process_label, "pk": node.pk, "node_type": node.node_type}
    ]
    links = node.base.links.get_incoming(link_type=LinkType.CALL_WORK).all()
    if len(links) > 0:
        parent_processes.extend(get_parent_processes(links[0].node.pk))
    return parent_processes
