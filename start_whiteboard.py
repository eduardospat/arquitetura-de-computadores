#!/usr/bin/env python3
"""
Launcher for the Arquitetura de Computadores Whiteboard.
Usage: python start_whiteboard.py
"""
import os
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))
whiteboard_server = os.path.join(base_dir, 'whiteboard', 'server.py')

if __name__ == '__main__':
    os.chdir(os.path.join(base_dir, 'whiteboard'))
    with open('server.py', 'r', encoding='utf-8') as f:
        code = f.read()
    exec(compile(code, 'server.py', 'exec'))
