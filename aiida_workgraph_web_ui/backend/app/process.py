from aiida_workgraph_web_ui.backend.app.node_table import (
    make_node_router,
    process_project,
    projected_data_to_dict_process,
)
from aiida.orm import ProcessNode


router = make_node_router(
    node_cls=ProcessNode,
    prefix="process",
    project=process_project,
    get_data_func=projected_data_to_dict_process,
)
