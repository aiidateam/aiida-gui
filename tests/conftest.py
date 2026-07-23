import pytest
from aiida.orm import Computer, InstalledCode, load_computer, load_code
from aiida.common.exceptions import NotExistent

pytest_plugins = "aiida.tools.pytest_fixtures"


@pytest.fixture(scope="session")
def fixture_localhost(aiida_profile):
    """Return a session-scoped localhost Computer."""
    try:
        localhost = load_computer("localhost")
    except NotExistent:
        localhost = Computer(
            label="localhost",
            hostname="localhost",
            transport_type="core.local",
            scheduler_type="core.direct",
            workdir="/tmp/aiida",
        ).store()

        localhost.configure()

    localhost.set_default_mpiprocs_per_machine(1)
    return localhost


@pytest.fixture(scope="session")
def add_code(fixture_localhost):
    """Return a session-scoped arithmetic.add code."""
    try:
        return load_code("add@localhost")
    except NotExistent:
        return InstalledCode(
            label="add",
            computer=fixture_localhost,
            filepath_executable="/bin/bash",
            default_calc_job_plugin="core.arithmetic.add",
        ).store()
