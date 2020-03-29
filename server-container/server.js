'use strict'

const fs = require("fs")
const events = require('events')
const WebSocket = require("ws")

const WEBSOCKET_SERVER_PORT = 8081;
const filepath = "logs.txt"
const NEW_LINE_CHARACTERS = ["\n", "\r", "\r\n"]
const readUptoLine = 10;

function tailF(filepath,readUptoLine,cb){

    fs.open(filepath,"r",(err,fd)=>{
        if(err) return cb(err,null)
        let cachedLines = []
        let filesize = fs.statSync(filepath).size;
        let bytesReadFromBack = 0;
        let currentLine = "";

        (function readCharBackWards(){

            fs.read(fd,Buffer.alloc(1),0,1,filesize - bytesReadFromBack - 1,(err,bytesRead,buffer)=>{
                
                if(err) return cb(err,null);

                let character = buffer.toString();

                bytesReadFromBack++;

                if(NEW_LINE_CHARACTERS.includes(character)){
                    cachedLines.unshift(currentLine)
                    currentLine = ""
                }
                else
                currentLine = character + currentLine;
                
                if(bytesReadFromBack >= filesize || cachedLines.length >= readUptoLine){
                    if(cachedLines !== "")
                        cachedLines.unshift(currentLine)

                    return cb(null,cachedLines);
                }
                
                readCharBackWards();
            })
        })();
    })
}

const eventEmitter = new events.EventEmitter()
let previousSize = 0;

fs.watch(filepath, (event, filename) => {

    if (filename) {
        fs.stat(filepath, (err, stats) => {
            if (err)
                eventEmitter.emit("error!", err);

            if (stats.size !== previousSize) {

		fs.createReadStream(filepath,{start: previousSize})
		   .on('data',(buffer,err)=>{
			if(err){
				eventEmitter.emit("error!",err);
			}	
			else{
				eventEmitter.emit("filechange",buffer.toString())
			}
		});
		previousSize = stats.size		
            }
        });
    }
});

const websocketServer = new WebSocket.Server({ port: WEBSOCKET_SERVER_PORT },()=>{
console.log(`Listening on port ${WEBSOCKET_SERVER_PORT}`)
})

websocketServer.on('connection',wsConnection => {
    console.log("client connected")
    tailF(filepath,readUptoLine,(err,lines)=>{
    	if(err){
	  console.error(err)
	  return wsConnection.close()
	}
 	wsConnection.send(lines.join("\n"))
    });

    eventEmitter.on("filechange",data =>{
   	 wsConnection.send(data);
    });
    eventEmitter.on("error!",err=>{
        console.error(err)
        return wsConnection.close();
    });
})
