
import re

from subprocess import PIPE, Popen, TimeoutExpired

# NIC_PATTERN = r'^(?P<index>[\d+])\: (?P<name>[\S+])\: (?P<flags>\<[\S+]\>) (?P<params>)[.]\n'
NIC_PATTERN = (
    r"^(?P<ifindex>\d+)\:\s+(?P<ifname>\S+)\:\s+\<(?P<flags>\S+)\>\s+(?P<params>.+)"
)
LINK_PATTERN = r"^\s+link/(?P<link_type>\S+)\s+(?P<address>\S+)\s*(?P<params>.+)"
INET_PATTERN = (
    r"^\s+(?P<family>inet)\s+(?P<local>\S+)/(?P<prefixlen>\S+)\s*(?P<params>.+)"
)
INET6_PATTERN = (
    r"\s+(?P<family>inet6)\s+(?P<local>\S+)/(?P<prefixlen>\S+)\s*(?P<params>.+)"
)
ATHER_PATTERN = (
    r"\s+(?P<link_kind>(bridge|tun|veth|bridge_slave|bond))\s+(?P<params>.+)"
)

class CmdResult(object):
    cmd: str
    rc: int
    out: str
    err: str

    def __init__(self, cmd: str = "", rc: int = None, out="", err="") -> None:  # type: ignore
        self.cmd = cmd
        self.rc = rc
        self.out = out
        self.err = err
        pass

    def returnCode(self) -> int:
        return self.rc

    def stdout(self) -> str:
        return self.out

    def stderr(self) -> str:
        return self.err

    def __str__(self) -> str:
        return "cmd:{};code:{},output:{};err:{}".format(
            self.cmd, self.rc, self.out, self.err
        )


def RunCmd(
    cmd: str,
    verbose: bool = True,
    pipe: bool = True,
    wait=True,
    timeout: float = 1200,
    warpcmd: bool = True,
    notPrint: bool = False,
) -> CmdResult:
    realCmd = cmd

    if timeout < 1200:
        timeout = 1200

    if not pipe:
        p = Popen(realCmd, shell=True, close_fds=True)
        p.wait()
        return CmdResult(cmd, p.returncode)
    p = Popen(realCmd, shell=True, stdout=PIPE, stderr=PIPE, close_fds=True)
    if not wait:
        return CmdResult(cmd, p.returncode, out="", err="")

    # signal.alarm(timeout)
    try:
        stdout, stderr = p.communicate(timeout=timeout)
    except TimeoutExpired:
        p.kill()
        p.terminate()
        # try:
        #     os.kill(p.pid,signal.SIGTERM)
        # except Exception as e:
        #     logger.warning(e)
        stdout = b""
        stderr = b"timeout"
    # signal.alarm(0)
    return CmdResult(
        cmd, p.returncode, out=stdout.decode("utf-8"), err=stderr.decode("utf-8")
    )


def get_ip_as(ifname: str | None = None) -> list:
    cmd = "ip -d a s"
    if ifname:
        cmd = f"ip -d a s {ifname}"
    r = RunCmd(cmd)
    netdevs = []
    if r.out != "":
        data = {}
        lines = r.out.split("\n")
        for pline in lines:
            res = re.search(NIC_PATTERN, pline)
            if res:
                if len(data) > 0:
                    netdevs.append(data)
                    data = {}
                data = res.groupdict()
                if data:
                    flags = data["flags"].split(",")
                    data["flags"] = flags
                    tmp = data["params"].split(" ")
                    if len(tmp) % 2 == 0:
                        for i in range(1, len(tmp), 2):
                            if tmp[i - 1] == "state":
                                data["operstate"] = tmp[i].strip(" ")
                            else:
                                data[tmp[i - 1]] = tmp[i].strip(" ")
                    del data["params"]

                continue
            res = re.search(LINK_PATTERN, pline)
            if res:
                tmp = res.groupdict()
                if tmp:
                    for k, v in tmp.items():
                        if k != "params":
                            data[k] = v
                        else:
                            params = tmp["params"].split(" ")
                            if len(params) % 2 == 0:
                                for i in range(1, len(params), 2):
                                    data[tmp[str(i - 1)]] = tmp[str(i)].strip(" ")
                continue
            res = re.search(INET6_PATTERN, pline)
            if res:
                tmp = res.groupdict()
                if tmp:
                    if "addr_info" not in data:
                        data["addr_info"] = []
                    addr = {}

                    params = tmp["params"].split(" ")
                    del tmp["params"]
                    pl = len(params) - 1
                    addr["label"] = params[pl].strip(" ")
                    params = params[:pl]
                    if len(params) % 2 != 0:
                        params = params[: pl - 1]
                    for i in range(1, len(params), 2):
                        if params[i] == "":
                            continue
                        if params[i - 1] == "brd":
                            addr["broadcast"] = params[i].strip(" ")
                        else:
                            addr[params[i - 1]] = params[i].strip(" ")

                    for k, v in tmp.items():
                        addr[k] = v.strip(" ")

                    data["addr_info"].append(addr)  # type: ignore

                continue
            res = re.search(INET_PATTERN, pline)
            if res:
                tmp = res.groupdict()
                if tmp:
                    if "addr_info" not in data:
                        data["addr_info"] = []
                    addr = {}

                    params = tmp["params"].split(" ")
                    del tmp["params"]
                    pl = len(params) - 1
                    addr["label"] = params[pl].strip(" ")
                    params = params[:pl]
                    if len(params) % 2 != 0:
                        params = params[: pl - 1]

                    for i in range(1, len(params), 2):
                        if params[i] == "":
                            continue
                        if params[i - 1] == "brd":
                            addr["broadcast"] = params[i].strip(" ")
                        else:
                            addr[params[i - 1]] = params[i].strip(" ")

                    for k, v in tmp.items():
                        addr[k] = v.strip(" ")

                    data["addr_info"].append(addr)  # type: ignore
                continue

            res = re.search(ATHER_PATTERN, pline)
            if res:
                tmp = res.groupdict()
                if tmp:
                    if "linkinfo" not in data:
                        data["linkinfo"] = {}

                    params = tmp["params"].split(" ")
                    nparams = []
                    for p in params:
                        if p != "":
                            nparams.append(p)
                    td = {}
                    if len(nparams) % 2 == 0:
                        for i in range(1, len(nparams), 2):
                            td[nparams[i - 1]] = nparams[i]
                    if tmp["link_kind"].endswith("_slave"):
                        data["linkinfo"]["info_slave_kind"] = tmp["link_kind"].replace(  # type: ignore
                            "_slave", "", -1
                        )
                        data["linkinfo"]["info_slave_data"] = td  # type: ignore
                    else:
                        data["linkinfo"]["info_kind"] = tmp["link_kind"]  # type: ignore
                        data["linkinfo"]["info_data"] = td  # type: ignore
                continue

    return netdevs




