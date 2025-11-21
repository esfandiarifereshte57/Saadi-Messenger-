let messages = [];
let chats = [];

exports.handler = async (event) => {
  const { action, chatId, message, sender, senderName, user1, user2 } = JSON.parse(event.body);

  try {
    if (action === 'send_message') {
      // ارسال پیام
      const newMessage = {
        id: Date.now().toString(),
        chatId,
        text: message,
        sender,
        senderName,
        timestamp: new Date().toISOString(),
        status: 'delivered'
      };
      
      messages.push(newMessage);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: newMessage 
        })
      };
    }

    if (action === 'get_messages') {
      // دریافت پیام‌های چت
      const chatMessages = messages
        .filter(msg => msg.chatId === chatId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          messages: chatMessages 
        })
      };
    }

    if (action === 'create_chat') {
      // ایجاد چت جدید
      const existingChat = chats.find(chat => 
        chat.participants.includes(user1) && chat.participants.includes(user2)
      );
      
      if (existingChat) {
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            chat: existingChat 
          })
        };
      }
      
      const newChat = {
        id: `chat_${Date.now()}`,
        participants: [user1, user2],
        createdAt: new Date().toISOString(),
        type: 'private'
      };
      
      chats.push(newChat);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          chat: newChat,
          message: 'چت جدید ایجاد شد'
        })
      };
    }

    if (action === 'get_chats') {
      // دریافت چت‌های کاربر
      const userChats = chats.filter(chat => 
        chat.participants.includes(user1)
      );
      
      // اضافه کردن اطلاعات آخرین پیام
      const chatsWithDetails = userChats.map(chat => {
        const chatMessages = messages.filter(msg => msg.chatId === chat.id);
        const lastMessage = chatMessages[chatMessages.length - 1];
        const otherParticipant = chat.participants.find(p => p !== user1);
        
        return {
          id: chat.id,
          participants: chat.participants,
          type: chat.type,
          lastMessage: lastMessage ? lastMessage.text : 'شروع چت',
          lastMessageTime: lastMessage ? lastMessage.timestamp : chat.createdAt,
          unread: 0
        };
      });
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          chats: chatsWithDetails 
        })
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: 'خطا در سرور' 
      })
    };
  }
};