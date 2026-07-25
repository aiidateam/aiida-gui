import re

import pytest
from playwright.sync_api import expect


@pytest.mark.frontend
@pytest.mark.usefixtures('web_server')
def test_homepage(page):
    page.goto('')
    assert page.title() == 'AiiDA GUI'

    # Check if at least one of the links to Process is visible
    process_link_locator = page.locator("a[href='/process']")

    expect(process_link_locator.first).to_be_visible()


@pytest.mark.frontend
@pytest.mark.usefixtures('web_server', 'ran_workchain')
def test_process(page):
    page.goto('')
    page.click('a[href="/process"]')
    page.wait_for_url('**/process')

    # Check for Process Table Header
    expect(page.get_by_role('heading', name='Process')).to_be_visible()

    # Check for Table Headers in DataGrid
    expect(page.get_by_role('columnheader', name='PK')).to_be_visible()
    expect(page.get_by_role('columnheader', name='Created')).to_be_visible()
    expect(page.get_by_role('columnheader', name='Process label')).to_be_visible()
    expect(page.get_by_role('columnheader', name='State')).to_be_visible()
    # I don't know why the Actions column is not visible
    # assert page.get_by_role("columnheader", name="Actions").is_visible()

    # Check pagination controls
    expect(page.locator('.MuiPagination-root')).to_be_visible()

    # Check if at least one row is visible
    page.locator('[data-field="process_label"]').get_by_text('MultiplyAddWorkChain').hover()
    rows = page.get_by_role('row').all()
    assert len(rows) >= 2


@pytest.mark.frontend
@pytest.mark.usefixtures('web_server')
def test_process_item(page, ran_workchain):
    page.goto('/process/')
    page.get_by_role('link', name=str(ran_workchain.pk), exact=True).click()

    task_name = f'CALL-{ran_workchain.called_descendants[0].pk}'
    expect(page.get_by_text(task_name)).to_be_visible()

    # Click "Arrange" button
    page.get_by_role('button', name='Arrange').click()

    gui_node = page.get_by_text(task_name)

    # Check if background color changes
    gui_node_color = gui_node.evaluate('element => window.getComputedStyle(element).backgroundColor')
    assert gui_node_color == 'rgba(0, 0, 0, 0)'

    page.locator('.realtime-switch').click()
    expect(gui_node).to_have_css('background-color', 'rgb(0, 128, 0)')

    # Check if clicking a node opens the sidebar
    page.locator('.detail-switch').click()
    # pause here for debugging
    # page.pause()
    # page.wait_for_selector('[data-testid="input-x"] input', timeout=5000)  # Wait for up to 5 seconds
    # input_x_control = page.get_by_test_id("input-x").first.locator("input")
    # assert input_x_control.input_value() == "2"
    # Verify that clicking on the gui node will pop up a sidebar
    gui_node.click()
    node_details_sidebar = page.get_by_text('Task Details')
    node_details_sidebar.wait_for(state='visible')
    assert node_details_sidebar.is_visible()

    page.get_by_role('button', name='Close').click()
    node_details_sidebar.wait_for(state='hidden')
    assert node_details_sidebar.is_hidden()

    # Check if "Summary" tab works
    page.get_by_role('button', name='Summary').click()
    assert page.get_by_text('typeMultiplyAddWorkChain').is_visible()

    # Check if "Log" tab works
    page.get_by_role('button', name='Log').click()
    log_line = (
        page.locator('.log-content')
        .locator('div')
        .filter(has_text=re.compile(r'.*Submitted the `ArithmeticAddCalculation`:*'))
    )
    log_line.wait_for(state='visible')
    assert log_line.is_visible()

    # Verify that Time  works
    page.get_by_role('button', name='Time').click()
    expect(page.get_by_role('heading', name='Node Process Timeline')).to_be_visible()
    expect(page.locator('body')).to_contain_text(task_name)


@pytest.mark.frontend
@pytest.mark.usefixtures('web_server')
def test_datanode_item(page, ran_workchain):
    page.goto('/datanode/')
    # Check for Table Headers in DataGrid
    expect(page.get_by_role('columnheader', name='PK')).to_be_visible()
    expect(page.get_by_role('columnheader', name='Created')).to_be_visible()
    expect(page.get_by_role('columnheader', name='Label')).to_be_visible()

    data_node_pk = ran_workchain.called_descendants[0].inputs.x.pk

    # Click on the link for the specific data node
    page.get_by_role('link', name=str(data_node_pk), exact=True).click()

    # Ensure at least 3 rows exist (header + 2 data rows)
    expect(page.get_by_role('row').nth(2)).to_be_visible()
    assert page.get_by_role('row').count() >= 3
    rows = page.get_by_role('row').all()
    assert 'value' in rows[1].text_content()
    assert 'node_type' in rows[2].text_content()


@pytest.mark.frontend
@pytest.mark.usefixtures('web_server', 'ran_workchain')
def test_daemon(page):
    page.goto('/daemon/')
    # Verify that only one row is visible
    expect(page.locator(':nth-match(tr, 1)')).to_be_visible()
    expect(page.locator(':nth-match(tr, 2)')).to_be_hidden()

    # Verify that after starting the daemon one additional row appeared
    page.get_by_role('button', name='Start Daemon', exact=True).click()
    expect(page.locator(':nth-match(tr, 2)')).to_be_visible()
    expect(page.locator(':nth-match(tr, 3)')).to_be_hidden()

    # Verify that after restarting the daemon, the number of rows remains the same
    page.get_by_role('button', name='Restart Daemon').click()
    expect(page.locator(':nth-match(tr, 2)')).to_be_visible()
    expect(page.locator(':nth-match(tr, 3)')).to_be_hidden()

    # Verify that after adding workers one additional row appeared
    page.get_by_role('button', name='Increase Workers').click()
    expect(page.locator(':nth-match(tr, 3)')).to_be_visible()
    expect(page.locator(':nth-match(tr, 4)')).to_be_hidden()

    # Verify that after decreasing workers one row disappears
    page.get_by_role('button', name='Decrease Workers').click()
    expect(page.locator(':nth-match(tr, 2)')).to_be_visible()
    expect(page.locator(':nth-match(tr, 3)')).to_be_hidden()

    # Verify that stopping the daemon only the header row exists
    page.get_by_role('button', name='Stop Daemon').click()
    expect(page.locator(':nth-match(tr, 1)')).to_be_visible()
    expect(page.locator(':nth-match(tr, 2)')).to_be_hidden()


############################
# Tests mutating the state #
############################
# The tests below change the state of the aiida database and cannot necessary be executed in arbitrary order.


@pytest.mark.frontend
@pytest.mark.usefixtures('web_server', 'ran_workchain')
def test_process_delete(page):
    """Tests deleting the last process in DataGrid, accounting for pagination."""
    page.goto('/process')

    # Locate the last row and capture its unique PK from the link
    last_row = page.get_by_role('row').last
    node_link = last_row.get_by_role('link')
    node_id = node_link.inner_text()

    # Verify that cancelling deletion does not remove the row
    delete_button = last_row.get_by_role('button', name='Delete')
    delete_button.click()
    expect(page.get_by_text('Confirm deletion')).to_be_visible()
    page.get_by_role('button', name='Cancel').click()
    expect(last_row).to_be_visible()

    # Confirm deletion
    delete_button.click()
    expect(page.get_by_text('Confirm deletion')).to_be_visible()
    page.get_by_role('button', name='Delete').click()

    # Wait for the grid to refresh and assert that no link with the old PK remains
    expect(page.get_by_role('link', name=node_id)).to_have_count(0)


@pytest.mark.frontend
@pytest.mark.usefixtures('web_server', 'ran_workchain')
def test_datanode_delete(page):
    """Tests deleting the last DataNode in DataGrid, accounting for pagination."""
    page.goto('/datanode')

    # Locate the last row and capture its unique PK from the link
    last_row = page.get_by_role('row').last
    node_link = last_row.get_by_role('link')
    node_id = node_link.inner_text()

    # Verify that cancelling deletion does not remove the row
    delete_button = last_row.get_by_role('button', name='Delete')
    delete_button.click()
    expect(page.get_by_text('Confirm deletion')).to_be_visible()
    page.get_by_role('button', name='Cancel').click()
    expect(last_row).to_be_visible()

    # Confirm deletion
    delete_button.click()
    expect(page.get_by_text('Confirm deletion')).to_be_visible()
    page.get_by_role('button', name='Delete').click()

    # Wait for the grid to refresh and assert that no link with the old PK remains
    expect(page.get_by_role('link', name=node_id)).to_have_count(0)
