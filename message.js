let messages = [];
let chats = [];

exports.handler = async (event) => {
  const { action, chatId, message, sender, user1, user2 } = JSON.parse(event.body);

  if (action === 'send_message') {
    const newMessage = {
      id: Date.now().toString(),
      chatId,
      text: message,
      sender,
      timestamp: new Date().toISOString()
    };
    
    messages.push(newMessage);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: newMessage })
    };
  }

  if (action === 'get_messages') {
    const chatMessages = messages.filter(msg => msg.chatId === chatId);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, messages: chatMessages })
    };
  }

  if (action === 'create_chat') {
    const existingChat = chats.find(chat => 
      chat.participants.includes(user1) && chat.participants.includes(user2)
    );
    
    if (existingChat) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, chat: existingChat })
      };
    }
    
    const newChat = {
      id: `chat_${Date.now()}`,
      participants: [user1, user2],
      createdAt: new Date().toISOString()
    };
    
    chats.push(newChat);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, chat: newChat })
    };
  }
};