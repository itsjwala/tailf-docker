# tailf-docker

tailf is a client server websocket application. consider it as `tail -f` (unix command?) with jetpack :rocket:

### Learnings

#### docker-compose stuff


Run in detach mode 
```
docker-compose up -d
```
optionally we can scale server container to 2 containers 

```
docker-compose scale tailfserver=4
```

I had 4 tailfsever for no goodreason :smile:

since `server-container/logs.txt` is already mounted in tailfserver we can modify it and check tailfclient's output at the same time

Note:- get container name of tailfclient from `docker ps` / `docker container ls` (both are synonyms)

```sh
➜  tailf git:(master) docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS               NAMES
018e595b5642        tailfclient:dev     "node /tmp/client.js…"   17 minutes ago      Up 17 minutes                           tailf_tailfclient_1
87438477b5fb        tailfserver:dev     "node /tmp/server.js"    17 minutes ago      Up 17 minutes       8081/tcp            tailf_tailfserver_2
bb5877a81079        tailfserver:dev     "node /tmp/server.js"    17 minutes ago      Up 17 minutes       8081/tcp            tailf_tailfserver_3
cfd233e2efcf        tailfserver:dev     "node /tmp/server.js"    17 minutes ago      Up 17 minutes       8081/tcp            tailf_tailfserver_1
```

```sh
docker logs -f tailf_tailfclient_1
```

#### Docker Container

Much better explained on internet.
my 2 cents :- It creates isolated environment for you application to run, in the end its a process which can be take more/less resource and which can be killed. This Isolated enviroment(namespaces) runs your command(ENTRYPOINT instruction) as PID 1( If this dies container dies which inturn kills other child processes dead(your application code))

#### Docker Image

much better explained on internet


#### Docker Network
docker has bridge network so this containers can communicate with each other through this bridge network (consider it as docker container's network interface is connected to network interface of physical bridge | But this is all virtually created by docker)

get bridge network name from here

```sh
➜  tailf git:(master) docker network ls
NETWORK ID          NAME                DRIVER              SCOPE
f64ba3e99034        bridge              bridge              local
76ba911f3a2d        host                host                local
68e86b0288e1        none                null                local
214f890c925e        tailf_default       bridge              local
309516e8d59b        work_default        bridge              local
```

`tailf_default` is the bridge network which is used by `tailfserver` & `tailfclient` to communicate with each other 

further we can inspect this network bridge and findout interesting inforomation like what containers are connected to this bridge etc
```
docker inspect tailf_default
```

```json
[
    {
        "Name": "tailf_default",
        "Id": "214f890c925eb711fb5c779731dbf9ee50eb698d013119a4692d50586c847d05",
        "Created": "2020-03-29T12:32:54.4300438Z",
        "Scope": "local",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": null,
            "Config": [
                {
                    "Subnet": "172.18.0.0/16",
                    "Gateway": "172.18.0.1"
                }
            ]
        },
        "Internal": false,
        "Attachable": true,
        "Ingress": false,
        "ConfigFrom": {
            "Network": ""
        },
        "ConfigOnly": false,
        "Containers": {
            "018e595b56420cce506bfe9d80b80da05701028194ecb5dcfceb9283d781dfbd": {
                "Name": "tailf_tailfclient_1",
                "EndpointID": "47d45e2f143a4b70f3c79c0d08ae2897cb761e11fa77f940579999b9933ad7a0",
                "MacAddress": "02:42:ac:12:00:05",
                "IPv4Address": "172.18.0.5/16",
                "IPv6Address": ""
            },
            "87438477b5fbf215c9dececd16926a2bf6b6e7e5a873215a1e5b1817635536be": {
                "Name": "tailf_tailfserver_2",
                "EndpointID": "c441007bae0582d019e674b4564dd6be072fca69a233106066d04b7c4f9d3337",
                "MacAddress": "02:42:ac:12:00:04",
                "IPv4Address": "172.18.0.4/16",
                "IPv6Address": ""
            },
            "bb5877a81079897030d59776661e308798aaa5ce065fdc21c07cef554e418e77": {
                "Name": "tailf_tailfserver_3",
                "EndpointID": "5d109c12cb537398bbaf3e3bd83cfc7cbd1dd48545b213cc4cff7f577794dd12",
                "MacAddress": "02:42:ac:12:00:03",
                "IPv4Address": "172.18.0.3/16",
                "IPv6Address": ""
            },
            "cfd233e2efcf5171ed30571d94d70bffc91a727dcb437f1bffe9d66420a83a95": {
                "Name": "tailf_tailfserver_1",
                "EndpointID": "1698ee1ad5bc71948425ce583b4178c660dfa251cf91377b8e036ca309fbab81",
                "MacAddress": "02:42:ac:12:00:02",
                "IPv4Address": "172.18.0.2/16",
                "IPv6Address": ""
            }
        },
        "Options": {},
        "Labels": {
            "com.docker.compose.network": "default",
            "com.docker.compose.project": "tailf",
            "com.docker.compose.version": "1.25.4"
        }
    }
]

```

we can ping `tailfserver` from `tailfclient` 

```sh
➜  tailf git:(master) docker exec -it tailf_tailfclient_1 sh

/tmp # ping -c 2 tailf_tailfserver_1
PING tailf_tailfserver_1 (172.18.0.2): 56 data bytes
64 bytes from 172.18.0.2: seq=0 ttl=64 time=0.332 ms
64 bytes from 172.18.0.2: seq=1 ttl=64 time=0.256 ms

--- tailf_tailfserver_1 ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss
round-trip min/avg/max = 0.256/0.294/0.332 ms

/tmp # 
```

so how did `tailfclient` resolved `tailfserver` dns name?

we can check in `/etc/hosts` but we didn't find anything interesting

```sh
/tmp # cat /etc/hosts
127.0.0.1	localhost
::1	localhost ip6-localhost ip6-loopback
fe00::0	ip6-localnet
ff00::0	ip6-mcastprefix
ff02::1	ip6-allnodes
ff02::2	ip6-allrouters
172.18.0.5	018e595b5642
```

so there exist some external dns resolver which after some digging was hidding inside `/etc/resolv.conf` 

```sh
/tmp # cat /etc/resolv.conf
nameserver 127.0.0.11
options ndots:0
```

`127.0.0.11` is docker's inbuild lightweight dns. A good [article](http://collabnix.com/demonstrating-docker-1-12-service-discovery-with-docker-compose/) on this topic.



references
* https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
* https://docs.docker.com/network/network-tutorial-standalone/
* http://collabnix.com/demonstrating-docker-1-12-service-discovery-with-docker-compose/
* few docker network/container videos from https://www.youtube.com/channel/UCgpZCLvujvdWRAZBpU4_p-g

