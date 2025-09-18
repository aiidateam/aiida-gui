import click
import subprocess
import os
import signal
from pathlib import Path


def get_package_root():
    """Returns the root directory of the package."""
    current_file = Path(__file__)
    return current_file.parent


def get_pid_file_path():
    """Get the path to the PID file in the desired directory."""
    home_dir = Path.home()
    aiida_daemon_dir = home_dir / ".aiida" / "daemon"

    # Create the directory if it does not exist
    aiida_daemon_dir.mkdir(parents=True, exist_ok=True)

    return aiida_daemon_dir / "web_processes.pid"


@click.group()
def cli():
    """aiida-gui: manage the FastAPI‐based GUI (start/stop)."""
    pass


@cli.command()
@click.option(
    "--watch",
    is_flag=True,
    default=False,
    help="Enable auto-reloading when files change (useful for development).",
)
@click.option(
    "--background",
    "-b",
    is_flag=True,
    default=False,
    help="Run the web application in the background and detach from terminal.",
)
def start(watch, background):
    """Start the web application (FastAPI backend)."""
    pid_file_path = get_pid_file_path()
    command = [
        "uvicorn",
        "aiida_gui.app.api:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
    ]

    if watch:
        command.append("--reload")
        click.echo("Watch mode enabled: The application will reload on file changes.")
    else:
        click.echo(
            "Watch mode disabled: The application will not reload on file changes."
        )

    if background:
        click.echo("Starting the web application in background...")
        # Launch uvicorn in the background
        backend_process = subprocess.Popen(command)
        # Write the PID into our file for later stop
        with open(pid_file_path, "w") as pid_file:
            pid_file.write(f"backend:{backend_process.pid}\n")
        click.echo(f"Web backend started (PID {backend_process.pid}).")
    else:
        click.echo("Starting the web application in foreground. Press Ctrl+C to stop.")
        try:
            # Block until the process is terminated
            subprocess.call(command)
        except KeyboardInterrupt:
            click.echo("\nWeb backend terminated by user.")


@cli.command()
def stop():
    """Stop the web application (terminates any PIDs in the .aiida/daemon file)."""
    pid_file_path = get_pid_file_path()

    if not pid_file_path.exists():
        click.echo("No running web application found.")
        return

    with open(pid_file_path, "r") as pid_file:
        for line in pid_file:
            proc_name, pid = line.strip().split(":")
            try:
                os.kill(int(pid), signal.SIGTERM)
                click.echo(f"Stopped {proc_name} (PID: {pid})")
            except ProcessLookupError:
                click.echo(f"{proc_name} (PID: {pid}) was not found")

    os.remove(pid_file_path)
    click.echo("Cleaned up PID file.")


if __name__ == "__main__":
    cli()
