// Obtener elementos del DOM
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const recipientSelect = document.getElementById('recipient-select');
const emojiButtonElement = document.getElementById('emoji-button');
const emojiPicker = document.getElementById('emoji-picker');
const chatContainer = document.getElementById('chat-container');
const termsOfServiceElement = document.getElementById('terms-of-service');
const termsOfServiceAcceptButton = document.getElementById('terms-of-service-accept');
const messageInputArea = document.getElementById('message-input-area');
const userListElement = document.getElementById('user-list');
const loginFormElement = document.getElementById('login-form');
const logoutButtonElement = document.getElementById('logout-button');
const imageInput = document.getElementById('image-input');


// Emojis (20)
const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '😍', '😎', '😋', '😜', '🤪', '😝', '🤗'];

// Variables globales
let users = [];
let currentUser = null;
let ws;
let userImages = {}; // Almacenar las imágenes de perfil de los usuarios

/**
 * Crea la conexión WebSocket.
 */
function connectWebSocket() {
    //const wsUrl = `ws://${location.host}/chat`; // Para despliegue
    const wsUrl = `ws://localhost:3000`;  //PARA PRUEBAS LOCALES
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Conexión WebSocket establecida');
        if (currentUser) {
            sendHandshake(currentUser);
        }
    };

    ws.onmessage = (message) => {
        handleMessage(message);
    };

    ws.onclose = () => {
        console.log('Conexión WebSocket cerrada');
    };

    ws.onerror = (error) => {
        console.error('Error de WebSocket:', error);
    };
}

/**
 * Envía un mensaje de tipo "handshake" al servidor.
 * @param {string} username - El nombre de usuario.
 */
function sendHandshake(username) {
    const handshakeMessage = {
        type: 'handshake',
        username: username,
    };
    ws.send(JSON.stringify(handshakeMessage));
}

/**
 * Agrega un mensaje al chat.
 * @param {string} sender - El nombre del remitente.
 * @param {string} message - El mensaje a mostrar.
 * @param {boolean} isSender - Indica si el mensaje lo envió el usuario actual.
 * @param {string} senderImage - La URL de la imagen de perfil del remitente.
 */
function addMessageToChat(sender, message, isSender, senderImage) {
    const messageElement = document.createElement('p');
    const avatarElement = document.createElement('span');
    avatarElement.classList.add('user-avatar');
     if (senderImage) {
        avatarElement.style.backgroundImage = `url(${senderImage})`;
        avatarElement.style.backgroundColor = 'transparent';
     } else {
        avatarElement.textContent = sender.charAt(0).toUpperCase();
     }

    messageElement.appendChild(avatarElement);
    messageElement.textContent += ` ${sender}: ${message}`;
    if (isSender) {
        messageElement.classList.add('sender');
    }
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Maneja los mensajes recibidos a través de WebSocket.
 * @param {MessageEvent} event - El evento del mensaje.
 */
function handleMessage(event) {
    const data = JSON.parse(event.data);
    console.log('Mensaje recibido:', data);

    switch (data.type) {
        case 'message':
            const senderName = data.sender === currentUser ? 'Tú' : data.sender;
            addMessageToChat(senderName, data.message, data.sender === currentUser, data.senderImage);
            break;
        case 'userList':
            users = data.users;
            updateUserList();
            break;
        case 'handshake':
            if (data.username && data.username !== currentUser) {
                users.push(data.username);
                updateUserList();
            }
            break;
        case 'loginSuccess':
            currentUser = data.username;
            users = data.userList;
            userImages = data.userImages || {};
            updateUserList();
            showChatInterface();
            break;
        case 'error':
            alert(data.message);
            break;
         case 'image':
            const senderNameImage = data.sender === currentUser ? 'Tú' : data.sender;
            addImageToChat(senderNameImage, data.imageUrl, data.sender === currentUser);
            break;
    }
}

/**
 * Envía un mensaje a través de WebSocket.
 */
function sendMessage() {
    const message = messageInput.value.trim();
    const recipient = recipientSelect.value;

    if (message !== '') {
        const messageData = {
            type: 'message',
            sender: currentUser,
            recipient: recipient,
            message: message,
            senderImage: userImages[currentUser] // Enviar la URL de la imagen del remitente
        };
        ws.send(JSON.stringify(messageData));
        messageInput.value = '';
        messageInput.focus();
    }
}

/**
 * Actualiza la lista de usuarios en la barra lateral y el selector.
 */
function updateUserList() {
    userListElement.innerHTML = '';
    recipientSelect.innerHTML = '<option value="all">Todos</option>';
    users.forEach(user => {
        if (user !== currentUser) { // No mostrar al usuario actual en la lista
            const userItem = document.createElement('div');
            userItem.classList.add('user-item');
            const avatarElement = document.createElement('span');
            avatarElement.classList.add('user-avatar');
            avatarElement.textContent = user.charAt(0).toUpperCase();
             if (userImages[user]) {
                avatarElement.style.backgroundImage = `url(${userImages[user]})`;
                avatarElement.style.backgroundColor = 'transparent';
            }
            userItem.appendChild(avatarElement);
            userItem.textContent += user;
            userItem.addEventListener('click', () => {
                recipientSelect.value = user;
            });
            userListElement.appendChild(userItem);

            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            recipientSelect.appendChild(option);
        }
    });
}

/**
 * Muestra la interfaz de chat y oculta el formulario de login/registro.
 */
function showChatInterface() {
    document.getElementById('login-register-form').classList.add('hidden');
    chatContainer.classList.remove('hidden');
    termsOfServiceElement.classList.add('hidden');
    connectWebSocket();
}

/**
 * Agrega los emojis al selector de emojis.
 */
function addEmojisToPicker() {
    emojis.forEach(emoji => {
        const emojiButton = document.createElement('button');
        emojiButton.textContent = emoji;
        emojiButton.addEventListener('click', () => {
            messageInput.value += emoji;
            messageInput.focus();
            emojiPicker.classList.add('hidden');
        });
        emojiPicker.appendChild(emojiButton);
    });
}

/**
 * Valida el formulario de inicio de sesión/registro.
 */
function validateForm() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const usernameError = document.getElementById('username-error');
    const passwordError = document.getElementById('password-error');
    let isValid = true;

    if (!usernameInput.value.trim()) {
        usernameError.textContent = 'Por favor, ingresa tu nombre de usuario.';
        isValid = false;
    } else {
        usernameError.textContent = '';
    }

    if (!passwordInput.value.trim()) {
        passwordError.textContent = 'Por favor, ingresa tu contraseña.';
        isValid = false;
    } else {
        passwordError.textContent = '';
    }

    return isValid;
}

// Event Listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
        event.preventDefault();
    }
});
emojiButtonElement.addEventListener('click', () => {
    emojiPicker.classList.toggle('hidden');
});
loginFormElement.addEventListener('submit', (event) => {
    event.preventDefault();
    if (validateForm()) {
        const username = event.target.username.value.trim();
        const password = event.target.password.value.trim();

        // Simulación de registro/login exitoso
        currentUser = username;
        const loginResponse = {
            type: 'loginSuccess',
            username: currentUser,
            userList: users,
            userImages: userImages
        };
        handleMessage({ data: JSON.stringify(loginResponse) });
    }
});

termsOfServiceAcceptButton.addEventListener('click', () => {
    if (currentUser) {
        termsOfServiceElement.classList.add('hidden');
        showChatInterface();
    } else {
        termsOfServiceElement.classList.add('hidden');
        document.getElementById('login-register-form').classList.remove('hidden');
    }
});

logoutButtonElement.addEventListener('click', () => {
    currentUser = null;
    users = [];
    userImages = {};
    ws.close();
    document.getElementById('login-register-form').classList.remove('hidden');
    chatContainer.classList.add('hidden');
    localStorage.removeItem('loggedInUser');
    recipientSelect.innerHTML = '<option value="all">Todos</option>';
    userListElement.innerHTML = '';
});

imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            userImages[currentUser] = imageDataUrl; // Guarda la imagen
            // Enviar la imagen al servidor (opcional, dependiendo de tu arquitectura)
            const imageMessage = {
                type: 'image',
                sender: currentUser,
                imageUrl: imageDataUrl,
                recipient: recipientSelect.value
            };
            ws.send(JSON.stringify(imageMessage));

            addImageToChat(currentUser, imageDataUrl, true);
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    }
});

function addImageToChat(sender, imageUrl, isSender) {
    const messageElement = document.createElement('p');
    const avatarElement = document.createElement('span');
    avatarElement.classList.add('user-avatar');
    avatarElement.style.backgroundImage = `url(${imageUrl})`;
    avatarElement.style.backgroundColor = 'transparent';
    messageElement.appendChild(avatarElement);
    messageElement.textContent = ` ${sender}: `;

    const imgElement = document.createElement('img');
    imgElement.src = imageUrl;
    imgElement.style.maxWidth = '200px';
    imgElement.style.borderRadius = '0.5rem';
    messageElement.appendChild(imgElement);

    if (isSender) {
        messageElement.classList.add('sender');
    }
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Mostrar los Términos de Servicio al cargar la página
window.onload = () => {
    addEmojisToPicker();
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        currentUser = storedUser;
        showChatInterface();
    } else {
        termsOfServiceElement.classList.remove('hidden');
    }
};