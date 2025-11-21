const bcrypt = require('bcryptjs');

// دیتابیس ساده در memory
let users = [];

exports.handler = async (event) => {
  const { action, username, userid, password } = JSON.parse(event.body);

  if (action === 'register') {
    // ثبت‌نام کاربر
    const existingUser = users.find(u => u.userid === userid);
    if (existingUser) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'این ایدی کاربری قبلاً ثبت شده است' })
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username,
      userid,
      password: hashedPassword,
      online: true
    };
    
    users.push(newUser);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        user: { id: newUser.id, username, userid, online: true }
      })
    };
  }

  if (action === 'login') {
    // ورود کاربر
    const user = users.find(u => u.username === username || u.userid === username);
    if (!user) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'کاربری با این مشخصات وجود ندارد' })
      };
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'رمز عبور اشتباه است' })
      };
    }

    user.online = true;
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: { id: user.id, username: user.username, userid: user.userid, online: true }
      })
    };
  }
};