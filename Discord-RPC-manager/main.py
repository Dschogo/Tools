import psutil
import win32.win32gui as win32gui
import win32.win32process as win32process
from pypresence import Presence
import time
import json


client_id = "849019641245335552"
RPC = Presence(client_id, pipe=0)
RPC.connect()


with open("config.json", "r") as f:
    list = json.load(f)


def name_mode(win_title: str, entry):
    if entry["name_mode"] == "ends_with":
        return win_title.endswith(entry["name"])


def check_precense_list(win_title: str, win_exe: str):

    for i in list:
        print(name_mode(win_title=win_title, entry=i))
        if name_mode(win_title=win_title, entry=i) and i["exe"] == win_exe:
            RPC.update(details=i["name"], state="13")  # Set the presence


while True:
    win_exe = psutil.Process(win32process.GetWindowThreadProcessId(win32gui.GetForegroundWindow())[-1]).name().lower()
    win_title = str(win32gui.GetWindowText(win32gui.GetForegroundWindow())).lower()
    print(f"{win_title} ::::: {win_exe}")

    if check_precense_list(win_title, win_exe):
        pass

    # for i in range(0, len(list)):
    #     try:
    #         p = psutil.Process(list[i])
    #         print(p)
    #         # if p.cmdline()[0].find("chrome.exe") != -1:
    #         #     # PuTTY found. Kill it
    #         #     break
    #     except:
    #         pass
    time.sleep(3)  # Can only update rich presence every 15 seconds
