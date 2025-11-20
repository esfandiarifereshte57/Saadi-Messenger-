const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// دیتابیس واقعی (در memory - برای تولید از MongoDB استفاده کن)
let users = [];
let messages = [];
let chats = [];
let onlineUsers = new Map(); // کاربران آنلاین

// Route اصلی
app.get('/', (req, res) => {
  res.json({ message: 'خوش آمدید به پیامرسان سعدی!', status: 'فعال' });
});

// ثبت‌نام کاربر
app.post('/api/register', async (req, res) => {
  try {
    const { username, userid, password } = req.body;
    
    if (!username || !userid || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'لطفاً تمام فیلدها را پر کنید' 
      });
    }

    // بررسی وجود کاربر
    const existingUser = users.find(u => u.userid === userid);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'این ایدی کاربری قبلاً ثبت شده است' 
      });
    }

    // هش کردن رمز عبور
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // ایجاد کاربر جدید
    const newUser = {
      id: uuidv4(),
      username,
      userid,
      password: hashedPassword,
      online: true,
      verified: false,
      createdAt: new Date(),
      lastSeen: new Date()
    };
    
    users.push(newUser);
    
    console.log('👤 کاربر جدید ثبت‌نام کرد:', username);
    
    res.json({
      success: true,
      message: 'حساب کاربری با موفقیت ایجاد شد',
      user: {
        id: newUser.id,
        username: newUser.username,
        userid: newUser.userid,
        online: newUser.online,
        verified: newUser.verified
      }
    });
    
  } catch (error) {
    console.error('خطا در ثبت‌نام:', error);
    res.status(500).json({ 
      success: false, 
      error: 'خطا در سرور' 
    });
  }
});

// ورود کاربر
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'لطفاً نام کاربری و رمز عبور را وارد کنید' 
      });
    }
    
    // پیدا کردن کاربر
    const user = users.find(u => u.username === username || u.userid === username);
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: 'کاربری با این مشخصات وجود ندارد' 
      });
    }
    
    // بررسی رمز عبور
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'رمز عبور اشتباه است' 
      });
    }
    
    // به‌روزرسانی وضعیت
    user.online = true;
    user.lastSeen = new Date();
    
    console.log('✅ کاربر وارد شد:', user.username);
    
    res.json({
      success: true,
      message: 'ورود موفقیت‌آمیز بود',
      user: {
        id: user.id,
        username: user.username,
        userid: user.userid,
        online: user.online,
        verified: user.verified
      }
    });
    
  } catch (error) {
    console.error('خطا در ورود:', error);
    res.status(500).json({ 
      success: false, 
      error: 'خطا در سرور' 
    });
  }
});

// دریافت لیست کاربران
app.get('/api/users', (req, res) => {
  const usersList = users.map(user => ({
    id: user.id,
    username: user.username,
    userid: user.userid,
    online: user.online,
    verified: user.verified,
    lastSeen: user.lastSeen
  }));
  
  res.json({
    success: true,
    users: usersList
  });
});

// ایجاد چت جدید
app.post('/api/chats/create', (req, res) => {
  try {
    const { user1, user2 } = req.body;
    
    if (!user1 || !user2) {
      return res.status(400).json({ 
        success: false, 
        error: 'کاربران مشخص نشده‌اند' 
      });
    }
    
    // بررسی وجود چت
    const existingChat = chats.find(chat => 
      (chat.participants.includes(user1) && chat.participants.includes(user2))
    );
    
    if (existingChat) {
      return res.json({
        success: true,
        chat: existingChat,
        message: 'چت از قبل وجود دارد'
      });
    }
    
    // ایجاد چت جدید
    const newChat = {
      id: `chat_${uuidv4()}`,
      participants: [user1, user2],
      createdAt: new Date(),
      type: 'private',
      lastMessage: '',
      lastMessageTime: new Date()
    };
    
    chats.push(newChat);
    
    console.log('💬 چت جدید ایجاد شد:', newChat.id);
    
    res.json({
      success: true,
      chat: newChat,
      message: 'چت جدید ایجاد شد'
    });
    
  } catch (error) {
    console.error('خطا در ایجاد چت:', error);
    res.status(500).json({ 
      success: false, 
      error: 'خطا در سرور' 
    });
  }
});

// دریافت چت‌های کاربر
app.get('/api/chats/:userid', (req, res) => {
  try {
    const userid = req.params.userid;
    
    const userChats = chats.filter(chat => 
      chat.participants.includes(userid)
    );
    
    // اضافه کردن اطلاعات آخرین پیام
    const chatsWithDetails = userChats.map(chat => {
      const chatMessages = messages.filter(msg => msg.chatId === chat.id);
      const lastMessage = chatMessages[chatMessages.length - 1];
      const otherParticipant = chat.participants.find(p => p !== userid);
      const otherUser = users.find(u => u.userid === otherParticipant);
      
      return {
        id: chat.id,
        name: otherUser ? otherUser.username : 'کاربر',
        participants: chat.participants,
        type: chat.type,
        lastMessage: lastMessage ? lastMessage.text : 'شروع چت',
        lastMessageTime: lastMessage ? lastMessage.timestamp : chat.createdAt,
        unread: 0,
        online: otherUser ? otherUser.online : false
      };
    });
    
    res.json({
      success: true,
      chats: chatsWithDetails
    });
    
  } catch (error) {
    console.error('خطا در دریافت چت‌ها:', error);
    res.status(500).json({ 
      success: false, 
      error: 'خطا در سرور' 
    });
  }
});

// دریافت پیام‌های یک چت
app.get('/api/messages/:chatId', (req, res) => {
  try {
    const chatId = req.params.chatId;
    
    const chatMessages = messages
      .filter(msg => msg.chatId === chatId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({
      success: true,
      messages: chatMessages
    });
    
  } catch (error) {
    console.error('خطا در دریافت پیام‌ها:', error);
    res.status(500).json({ 
      success: false, 
      error: 'خطا در سرور' 
    });
  }
});

// مدیریت ارتباطات Real-time با Socket.io
io.on('connection', (socket) => {
  console.log('🔗 کاربر متصل شد:', socket.id);
  
  // کاربر آنلاین می‌شود
  socket.on('user_online', (userData) => {
    onlineUsers.set(socket.id, userData);
    console.log('🟢 کاربر آنلاین:', userData.username);
    
    // اطلاع به سایر کاربران
    socket.broadcast.emit('user_status_change', {
      userid: userData.userid,
      online: true,
      username: userData.username
    });
  });
  
  // پیوستن به چت
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`💬 کاربر به چت ${chatId} پیوست`);
  });
  
  // ارسال پیام
  socket.on('send_message', (data) => {
    try {
      const { chatId, message, sender, senderName } = data;
      
      if (!chatId || !message || !sender) {
        console.error('داده‌های پیام ناقص است');
        return;
      }
      
      // ایجاد پیام جدید
      const newMessage = {
        id: uuidv4(),
        chatId,
        text: message,
        sender,
        senderName,
        timestamp: new Date(),
        status: 'delivered'
      };
      
      // ذخیره پیام
      messages.push(newMessage);
      
      // ارسال پیام به همه کاربران در اتاق چت
      io.to(chatId).emit('new_message', newMessage);
      
      // به‌روزرسانی آخرین پیام چت
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        chat.lastMessage = message;
        chat.lastMessageTime = new Date();
      }
      
      console.log(`📨 پیام جدید در ${chatId}: ${message}`);
      
    } catch (error) {
      console.error('خطا در ارسال پیام:', error);
    }
  });
  
  // وضعیت تایپ کردن
  socket.on('typing_start', (data) => {
    socket.to(data.chatId).emit('user_typing', {
      userid: data.userid,
      username: data.username
    });
  });
  
  socket.on('typing_stop', (data) => {
    socket.to(data.chatId).emit('user_stop_typing', {
      userid: data.userid
    });
  });
  
  // قطع ارتباط
  socket.on('disconnect', () => {
    const userData = onlineUsers.get(socket.id);
    if (userData) {
      // به‌روزرسانی وضعیت کاربر
      const user = users.find(u => u.userid === userData.userid);
      if (user) {
        user.online = false;
        user.lastSeen = new Date();
      }
      
      // اطلاع به سایر کاربران
      socket.broadcast.emit('user_status_change', {
        userid: userData.userid,
        online: false,
        username: userData.username,
        lastSeen: new Date()
      });
      
      console.log('🔴 کاربر آفلاین شد:', userData.username);
      onlineUsers.delete(socket.id);
    }
    
    console.log('❌ کاربر قطع شد:', socket.id);
  });
});

// ایجاد چند کاربر نمونه
function createSampleUsers() {
  const sampleUsers = [
    { username: 'مدیر سعدی', userid: 'admin', password: '123456' },
    { username: 'کاربر نمونه ۱', userid: 'user1', password: '123456' },
    { username: 'کاربر نمونه ۲', userid: 'user2', password: '123456' },
    { username: 'پشتیبانی', userid: 'support', password: '123456' }
  ];
  
  sampleUsers.forEach(async (userData) => {
    const existingUser = users.find(u => u.userid === userData.userid);
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      users.push({
        id: uuidv4(),
        username: userData.username,
        userid: userData.userid,
        password: hashedPassword,
        online: false,
        verified: userData.userid === 'admin',
        createdAt: new Date(),
        lastSeen: new Date()
      });
    }
  });
  
  console.log('👥 کاربران نمونه ایجاد شدند');
}

// راه‌اندازی سرور
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 سرور پیامرسان سعدی روی پورت ${PORT} اجرا شد`);
  console.log(`📡 آدرس سرور: http://localhost:${PORT}`);
  console.log(`⚡ Socket.io آماده دریافت اتصالات است`);
  
  // ایجاد کاربران نمونه
  createSampleUsers();
});