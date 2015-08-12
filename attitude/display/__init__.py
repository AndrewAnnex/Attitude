from os import path
from jinja2 import FileSystemLoader, Environment

_ = path.join(path.dirname(__file__),'templates')
# Load templates
loader = FileSystemLoader(_)
env = Environment(loader=loader)

def report(*arrays, **kwargs):
    """
    Outputs a standalone HTML 'report card' for a
    measurement (or several grouped measurements),
    including relevant statistical information.
    """
    name = kwargs.pop("name",None)
    return str(name)
