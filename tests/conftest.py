import pytest
from aiida_workgraph import WorkGraph

pytest_plugins = "aiida.tools.pytest_fixtures"


@pytest.fixture
def wg_calcfunction() -> WorkGraph:
    """A workgraph with calcfunction."""

    wg = WorkGraph(name="test_debug_math")
    sumdiff1 = wg.add_task("workgraph.test_sum_diff", "sumdiff1", x=2, y=3)
    sumdiff2 = wg.add_task("workgraph.test_sum_diff", "sumdiff2", x=4)
    wg.add_link(sumdiff1.outputs[0], sumdiff2.inputs[1])
    return wg
