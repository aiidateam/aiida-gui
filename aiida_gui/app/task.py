from .utils import get_node_summary_table, get_node_inputs, get_node_outputs
from aiida import orm
from fastapi import APIRouter, HTTPException
import traceback
from typing import List
from aiida.engine.processes import control

router = APIRouter()


@router.get("/api/task/{id}/{path:path}")
async def read_task(id: int, path: str):
    from aiida.orm import load_node

    try:
        node = load_node(id)
        segments = path.split("/")
        if isinstance(node, orm.WorkChainNode):
            pk = int(segments[0].split("-")[-1])
            try:
                task_node = orm.load_node(pk)
            except Exception:
                raise HTTPException(status_code=404, detail=f"Process {pk} not found")

            # metadata = get_node_summary_table(node),
            # metadata["name"] = segments[0].split("_")[0]
            # metadata["node_type"] = node.node_type
            # metadata["identifier"] = "any"
            # try:
            #     executor = inspect.getsource(task_node.process_class)
            # except Exception:
            #     executor = f"{task_node.process_class.__module__}.{task_node.process_class.__name__}"
            executor = f"{task_node.process_class.__module__}.{task_node.process_class.__name__}"

            content = {
                "node_type": task_node.node_type,
                "label": segments[0].split("_")[0],
                "metadata": get_node_summary_table(task_node),
                "inputs": get_node_inputs(task_node),
                "outputs": get_node_outputs(task_node),
                "executor": executor,
                "process": {"pk": pk},
            }
        else:
            raise HTTPException(status_code=404, detail="Node not found")
        return content
    except KeyError as e:
        error_traceback = traceback.format_exc()  # Capture the full traceback
        print(error_traceback)
        raise HTTPException(
            status_code=404, detail=f"Process {id}/{path} not found, {e}"
        )


# General function to manage task actions
async def manage_task_action(action: str, id: int, tasks: List[str]):

    node = orm.load_node(id)
    if node.is_finished:
        msg = "Process is finished. Cannot pause tasks."
        raise HTTPException(status_code=400, detail=msg)
    if isinstance(node, orm.WorkChainNode):
        print(f"Performing {action} action on tasks {tasks} in workchain {id}")
        pks = [task.split("-")[-1] for task in tasks]
        try:
            if action == "pause":
                print(f"Pausing tasks {tasks}")
                try:
                    control.pause_processes(
                        pks,
                        all_entries=None,
                        timeout=5,
                        wait=False,
                    )
                    msg = "Paused tasks"
                except Exception as e:
                    print(f"Pause processes: {pks} failed: {e}")
            elif action == "play":
                print(f"Playing tasks {tasks}")
                try:
                    control.pause_processes(
                        pks,
                        all_entries=None,
                        timeout=5,
                        wait=False,
                    )
                    msg = "Played tasks"
                except Exception as e:
                    print(f"Play processes: {pks} failed: {e}")
            elif action == "kill":
                print(f"Killing tasks {tasks}")
                try:
                    control.pause_processes(
                        pks,
                        all_entries=None,
                        timeout=5,
                        wait=False,
                    )
                    msg = "Killed tasks"
                except Exception as e:
                    print(f"Kill processes: {pks} failed: {e}")
            else:
                raise HTTPException(status_code=400, detail="Unsupported action")

            return {"message": msg}

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


# Endpoint for pausing tasks in a process
@router.post("/api/process/tasks/pause/{id}")
async def pause_process_tasks(id: int, tasks: List[dict] = None):
    return await manage_task_action("pause", id, tasks)


# Endpoint for playing tasks in a process
@router.post("/api/process/tasks/play/{id}")
async def play_process_tasks(id: int, tasks: List[dict] = None):
    return await manage_task_action("play", id, tasks)


# Endpoint for killing tasks in a process
@router.post("/api/process/tasks/kill/{id}")
async def kill_workgraph_tasks(id: int, tasks: List[dict] = None):
    return await manage_task_action("kill", id, tasks)
