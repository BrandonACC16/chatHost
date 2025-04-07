const WebSocket = require('ws');
const http = require('http');
const { MongoClient } = require('mongodb'); // Importa MongoClient

// Reemplaza con tu URI de conexión de MongoDB
const MONGODB_URI = "mongodb+srv://chathost:host@chat.dau35am.mongodb.net/?retryWrites=true&w=majority&appName=chat";
const client = new MongoClient(MONGODB_URI);

let db;

// Función para conectar a la base de datos
async function connectToDatabase() {
    try {
        await client.connect();
        db = client.db('chatHost'); // Nombre de tu base de datos
        console.log('Conectado a la base de datos');
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
        // Considera cómo manejar este error (por ejemplo, detener el servidor)
    }
}

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const users = new Map();

wss.on('connection', async (ws) => {
    console.log('Cliente conectado');
     await connectToDatabase();

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'handshake') {
                const username = data.username;
                users.set(username, ws);
                ws.username = username;
                console.log(`Usuario ${username} conectado`);

                 // Guardar usuario en la base de datos
                try {
                    const usersCollection = db.collection('users');
                    const existingUser = await usersCollection.findOne({ username: username });
                    if (!existingUser) {
                        await usersCollection.insertOne({ username: username });
                        console.log(`Usuario ${username} guardado en la base de datos`);
                    }
                } catch (error) {
                    console.error('Error al guardar el usuario en la base de datos:', error);
                }


                // Enviar lista de usuarios actualizados a todos
                sendUserListToAll();

                // Enviar mensaje de éxito al cliente que se conectó
                ws.send(JSON.stringify({
                    type: 'loginSuccess',
                    username: username,
                    userList: Array.from(users.keys()),
                    userImages: {} // Enviar también la información de las imágenes de perfil si la tienes
                }));

            } else if (data.type === 'message') {
                const sender = data.sender;
                const recipient = data.recipient;
                const messageText = data.message;
                const senderImage = data.senderImage;

                 // Guardar mensaje en la base de datos
                try {
                    const messagesCollection = db.collection('messages');
                    await messagesCollection.insertOne({
                        sender: sender,
                        recipient: recipient,
                        message: messageText,
                        timestamp: new Date(),
                        senderImage: senderImage
                    });
                } catch (error) {
                    console.error('Error al guardar el mensaje en la base de datos:', error);
                }


                if (recipient === 'Todos') {
                    // Enviar a todos los usuarios
                    users.forEach((client, username) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'message', sender, message: messageText, senderImage }));
                        }
                    });
                } else {
                    // Enviar a un usuario específico
                    const recipientWs = users.get(recipient);
                    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                        recipientWs.send(JSON.stringify({ type: 'message', sender, message: messageText, senderImage }));
                    }
                    // Enviar también al emisor para que vea su propio mensaje
                    if (ws.readyState === WebSocket.OPEN){
                         ws.send(JSON.stringify({ type: 'message', sender: 'Tú', message: messageText, senderImage }));
                    }
                }
            } else if (data.type === 'image') {
                const sender = data.sender;
                const recipient = data.recipient;
                const imageUrl = data.imageUrl;

                // Guardar la imagen en la base de datos (opcional, si quieres persistirla)
                try {
                    const imagesCollection = db.collection('images');
                    await imagesCollection.insertOne({
                        sender: sender,
                        recipient: recipient,
                        imageUrl: imageUrl,
                        timestamp: new Date()
                    });
                } catch (error) {
                    console.error('Error al guardar la imagen en la base de datos:', error);
                }

                if (recipient === 'Todos') {
                    // Enviar a todos los usuarios
                    users.forEach((client, username) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'image', sender, imageUrl }));
                        }
                    });
                } else {
                    // Enviar a un usuario específico
                    const recipientWs = users.get(recipient);
                    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                        recipientWs.send(JSON.stringify({ type: 'image', sender, imageUrl }));
                    }
                     // Enviar también al emisor para que vea su propio mensaje
                    if (ws.readyState === WebSocket.OPEN){
                         ws.send(JSON.stringify({ type: 'image', sender: 'Tú', imageUrl }));
                    }
                }
            }
        } catch (error) {
            console.error('Error al procesar el mensaje:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Error al procesar el mensaje' }));
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado');
        // Eliminar el usuario de la lista
        let disconnectedUser;
        for (let [user, client] of users.entries()) {
            if (client === ws) {
                disconnectedUser = user;
                break;
            }
        }
        if (disconnectedUser) {
            users.delete(disconnectedUser);
            sendUserListToAll(); // Actualizar la lista de usuarios para los demás
            console.log(`Usuario ${disconnectedUser} desconectado`);
        }
    });

    ws.on('error', (error) => {
        console.error('Error en la conexión WebSocket:', error);
    });
});

function sendUserListToAll() {
    const userList = Array.from(users.keys());
     // Obtener imágenes de perfil de la base de datos (si las guardas allí)
    const userImages = {};
    users.forEach(async (ws, username) => {
        //Esto es un ejemplo, si guardaste las imagenes en la base de datos
        // try {
        //     const userCollection = db.collection('users');
        //     const user = await userCollection.findOne({username: username});
        //     userImages[username] = user.profileImage; // Suponiendo que el campo se llama 'profileImage'
        // } catch(e){
        //     console.log(e)
        // }

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'userList', users: userList, userImages: userImages }));
        }
    });
}

server.listen(3000, () => {
    console.log('Servidor WebSocket escuchando en el puerto 3000');
});
