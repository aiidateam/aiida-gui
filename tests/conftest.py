import pytest

pytest_plugins = "aiida.tools.pytest_fixtures"


@pytest.fixture
def fixture_localhost(aiida_localhost):
    """Return a localhost `Computer`."""
    localhost = aiida_localhost
    localhost.set_default_mpiprocs_per_machine(1)
    return localhost


@pytest.fixture
def add_code(fixture_localhost):
    from aiida.orm import InstalledCode, load_code
    from aiida.common import NotExistent

    try:
        code = load_code("add@localhost")
    except NotExistent:
        code = InstalledCode(
            label="add",
            computer=fixture_localhost,
            filepath_executable="/bin/bash",
            default_calc_job_plugin="arithmetic.add",
        )
        code.store()
    return code
