Node implementation (front+backend) of a simple webapp that can do both HTTP requests and WebSockets in the same app, showcased as a simple 'store and retrieve text to/from file' function.  Special note on the **auth** function implemented via the auth-key.  It is hardcoded in the client.html now, but can be made flexible or entered by user in order to have access to the backend functions.  Backend will not accept connections without the correct `auth-key` in either the header or URL when connecting over WebSockets. 

## How it works

### The view

![image](https://github.com/user-attachments/assets/ed4e3bc8-59ef-4e61-a8dc-7c764427446d)


### Switch between HTTP (req/rep cycles) and WebSocket messaging

![image](https://github.com/user-attachments/assets/860d5e17-6478-44a6-9d5d-d1155660812a)

Swtiching to WebSocket connects automatically

![image](https://github.com/user-attachments/assets/c9d06f78-100e-4bdb-a7cc-4d1548fbc8d5)

### Basic store - then - retrieve function (WebSocket mode)

![image](https://github.com/user-attachments/assets/162aa82a-4cc9-4cac-8a49-3c06bb86de26)


## Install

### (1) Run a simple nodejs setup.  In docker, 

```
docker pull node:18
```

### (2) Install the necessary node pacakges

```
npm install express body-parser cors ws
```

In docker:
```
docker run -v PATH-TO-YOUR-CODE:/app -p PORT:PORT node:18 npm install express body-parser cors ws
```

This will install the necssary packages and will make it possible to run the server (use the above to figure out the docker version of the command):
```
node manager.js
```

### (3) Run the client in browser

The server will return the contents of `client.html` on  the `/` path, so, just go to whatever location you have your server running on in the browser.  Use the above screenshots to navigate the functionality. 


That's it. 


