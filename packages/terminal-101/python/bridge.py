from dagshell.dagshell_fluent import DagShell
from dagshell.command_parser import CommandParser
from dagshell.terminal import CommandExecutor

shell = DagShell()
executor = CommandExecutor(shell)
parser = CommandParser()

def execute(cmd):
    try:
        parsed = parser.parse(cmd)
        result = executor.execute(parsed)
        return {'text': result.text or '', 'exit_code': result.exit_code}
    except Exception as e:
        return {'text': f"Error: {e}", 'exit_code': 1}

def get_cwd():
    return shell._cwd

def fs_exists(path):
    return shell.fs.exists(path)

def read_file(path):
    try:
        return shell.fs.read(path).decode('utf-8', errors='replace')
    except Exception:
        return None
